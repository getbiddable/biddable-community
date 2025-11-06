import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  addAgentApiHeaders,
  hasAgentPermission,
} from '@/lib/agent-api-middleware'
import { validateCampaignBudget } from '@/lib/agent-budget-validator'
import { CampaignCreateSchema } from '@/lib/agent-api-schemas'
import {
  validateRequestBody,
  createValidationErrorResponse,
  createUnknownErrorResponse,
  BudgetExceededError,
  DatabaseError,
  InternalError,
  ForbiddenError,
  createErrorResponse,
} from '@/lib/agent-api-errors'
import { logAuditEntry, createAuditEntry } from '@/lib/agent-audit-logger'

/**
 * POST /api/v1/agent/campaigns/create
 * Create a new campaign for the authenticated organization
 *
 * Request body:
 * {
 *   name: string (1-100 chars)
 *   platforms: ('google' | 'youtube' | 'reddit' | 'meta')[] (min 1)
 *   budget: number (1-10000)
 *   start_date: string (YYYY-MM-DD)
 *   end_date: string (YYYY-MM-DD)
 *   goal?: string (max 500 chars)
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { apiKeyId, organizationId, requestId, rateLimit, permissions } = authResult

  if (!hasAgentPermission(permissions, 'campaigns', 'write')) {
    const response = createErrorResponse(
      new ForbiddenError('API key is not authorized to create campaigns'),
      requestId
    )
    addAgentApiHeaders(response.headers, requestId, rateLimit)

    const responseBody = await response.clone().json()
    logAuditEntry(
      createAuditEntry(
        apiKeyId,
        organizationId,
        request,
        { status: 403, body: responseBody },
        startTime,
        undefined,
        'Permission denied: campaigns.write'
      )
    )

    return response
  }

  try {
    // Validate request body with Zod schema
    const validation = await validateRequestBody(request, CampaignCreateSchema)
    if (!validation.success) {
      const response = createValidationErrorResponse(validation.error, requestId)
      addAgentApiHeaders(response.headers, requestId, rateLimit)

      // Log audit entry for validation error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 400, body: responseBody },
          startTime,
          undefined,
          'Validation error'
        )
      )

      return response
    }

    const data = validation.data

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get first user from organization (use as created_by)
    const { data: orgMembers, error: orgError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single()

    if (orgError || !orgMembers) {
      console.error('Error getting org user:', orgError)
      const errorBody = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get organization user',
        }
      }
      const response = createErrorResponse(
        new InternalError('Failed to get organization user', { error: orgError?.message }),
        requestId
      )
      addAgentApiHeaders(response.headers, requestId, rateLimit)

      // Log audit entry for internal error
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 500, body: errorBody },
          startTime,
          data,
          orgError?.message || 'Failed to get organization user'
        )
      )

      return response
    }

    // Validate budget (enforce $10,000/month organizational limit)
    const budgetValidation = await validateCampaignBudget(
      organizationId,
      data.budget,
      data.start_date,
      data.end_date
    )

    if (!budgetValidation.valid) {
      const errorBody = {
        success: false,
        error: {
          code: 'BUDGET_EXCEEDED',
          message: 'Budget limit exceeded',
        }
      }
      const response = createErrorResponse(
        new BudgetExceededError({
          monthly_limit: budgetValidation.monthly_limit,
          current_total: budgetValidation.current_monthly_total,
          requested: budgetValidation.requested_budget,
          available: budgetValidation.available_budget,
          affected_month: budgetValidation.affected_month,
          campaigns: budgetValidation.existing_campaigns,
        }),
        requestId
      )
      addAgentApiHeaders(response.headers, requestId, rateLimit)

      // Log audit entry for budget exceeded error
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 400, body: errorBody },
          startTime,
          data,
          'Budget limit exceeded'
        )
      )

      return response
    }

    // Create campaign
    const { data: campaign, error: createError } = await supabase
      .from('campaigns')
      .insert({
        campaign_name: data.name,
        platforms: data.platforms,
        budget: data.budget,
        start_date: data.start_date,
        end_date: data.end_date,
        goal: data.goal,
        created_by: orgMembers.user_id,
        status: true, // Active by default
        payment_status: 'pending',
        amount_spent: 0,
        amount_collected: 0,
        media_fee_charged: 0,
        subscription_plan: 'free',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating campaign:', createError)
      const errorBody = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create campaign',
        }
      }
      const response = createErrorResponse(
        new DatabaseError('Failed to create campaign', { error: createError.message }),
        requestId
      )
      addAgentApiHeaders(response.headers, requestId, rateLimit)

      // Log audit entry for database error
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 500, body: errorBody },
          startTime,
          data,
          createError.message
        )
      )

      return response
    }

    const responseBody = {
      success: true,
      data: {
        campaign,
      },
    }

    const response = NextResponse.json(responseBody, { status: 201 })

    addAgentApiHeaders(response.headers, requestId, rateLimit)

    // Log audit entry (async, non-blocking)
    logAuditEntry(
      createAuditEntry(
        apiKeyId,
        organizationId,
        request,
        { status: 201, body: responseBody },
        startTime,
        data
      )
    )

    return response
  } catch (error) {
    console.error('Error in campaign create endpoint:', error)
    const response = createUnknownErrorResponse(error, requestId)
    addAgentApiHeaders(response.headers, requestId, rateLimit)

    // Log audit entry for error (async, non-blocking)
    logAuditEntry(
      createAuditEntry(
        apiKeyId,
        organizationId,
        request,
        { status: 500 },
        startTime,
        undefined,
        error instanceof Error ? error.message : String(error)
      )
    )

    return response
  }
}
