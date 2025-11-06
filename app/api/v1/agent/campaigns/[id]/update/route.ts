import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
  hasAgentPermission,
} from '@/lib/agent-api-middleware'
import { validateCampaignBudget, formatBudgetError } from '@/lib/agent-budget-validator'
import { z } from 'zod'
import { logAuditEntry, createAuditEntry } from '@/lib/agent-audit-logger'

/**
 * Validation schema for campaign updates (all fields optional)
 */
const CampaignUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  platforms: z.array(z.enum(['google', 'youtube', 'reddit', 'meta'])).min(1).optional(),
  budget: z.number().int().min(1).max(10000).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  goal: z.string().max(500).optional(),
  status: z.boolean().optional(),
})

/**
 * PATCH /api/v1/agent/campaigns/[id]/update
 * Update an existing campaign
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()

  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { apiKeyId, organizationId, requestId, rateLimit, permissions } = authResult

  if (!hasAgentPermission(permissions, 'campaigns', 'write')) {
    const response = createErrorResponse(
      'FORBIDDEN',
      'API key is not authorized to update campaigns',
      403,
      { resource: 'campaigns', action: 'write' },
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
    const campaignId = parseInt(params.id)

    if (isNaN(campaignId)) {
      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid campaign ID',
        400,
        { id: params.id },
        requestId
      )

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
          'Invalid campaign ID'
        )
      )

      return response
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = CampaignUpdateSchema.safeParse(body)
    if (!validation.success) {
      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid campaign data',
        400,
        { errors: validation.error.flatten().fieldErrors },
        requestId
      )

      // Log audit entry for validation error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 400, body: responseBody },
          startTime,
          body,
          'Invalid campaign data'
        )
      )

      return response
    }

    const data = validation.data

    // Validate date range if both provided
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date)
      const endDate = new Date(data.end_date)

      if (endDate <= startDate) {
        const response = createErrorResponse(
          'VALIDATION_ERROR',
          'End date must be after start date',
          400,
          { start_date: data.start_date, end_date: data.end_date },
          requestId
        )

        // Log audit entry for validation error
        const responseBody = await response.clone().json()
        logAuditEntry(
          createAuditEntry(
            apiKeyId,
            organizationId,
            request,
            { status: 400, body: responseBody },
            startTime,
            data,
            'End date must be after start date'
          )
        )

        return response
      }
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check campaign exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, created_by, budget, start_date, end_date')
      .eq('id', campaignId)
      .single()

    if (fetchError || !existing) {
      const response = createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Campaign not found',
        404,
        { campaign_id: campaignId },
        requestId
      )

      // Log audit entry for not found error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 404, body: responseBody },
          startTime,
          data,
          'Campaign not found'
        )
      )

      return response
    }

    // Verify user belongs to same org
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', existing.created_by)
      .single()

    if (orgError || userOrg?.organization_id !== organizationId) {
      const response = createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )

      // Log audit entry for forbidden error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 403, body: responseBody },
          startTime,
          data,
          'Access forbidden to campaign'
        )
      )

      return response
    }

    // Build update object
    const updateData: any = {}
    if (data.name !== undefined) updateData.campaign_name = data.name
    if (data.platforms !== undefined) updateData.platforms = data.platforms
    if (data.budget !== undefined) updateData.budget = data.budget
    if (data.start_date !== undefined) updateData.start_date = data.start_date
    if (data.end_date !== undefined) updateData.end_date = data.end_date
    if (data.goal !== undefined) updateData.goal = data.goal
    if (data.status !== undefined) updateData.status = data.status

    // Validate budget if budget, start_date, or end_date is being updated
    if (data.budget !== undefined || data.start_date !== undefined || data.end_date !== undefined) {
      const newBudget = data.budget ?? existing.budget
      const newStartDate = data.start_date ?? existing.start_date
      const newEndDate = data.end_date ?? existing.end_date

      const budgetValidation = await validateCampaignBudget(
        organizationId,
        newBudget,
        newStartDate,
        newEndDate,
        campaignId // Exclude current campaign from calculation
      )

      if (!budgetValidation.valid) {
        const errorResponse = formatBudgetError(budgetValidation)
        const response = NextResponse.json(errorResponse, { status: 400 })
        addAgentApiHeaders(response.headers, requestId, rateLimit)

        // Log audit entry for budget exceeded error
        logAuditEntry(
          createAuditEntry(
            apiKeyId,
            organizationId,
            request,
            { status: 400, body: errorResponse },
            startTime,
            data,
            'Budget limit exceeded'
          )
        )

        return response
      }
    }

    // Update campaign
    const { data: campaign, error: updateError } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating campaign:', updateError)
      const response = createErrorResponse(
        'DATABASE_ERROR',
        'Failed to update campaign',
        500,
        { error: updateError.message },
        requestId
      )

      // Log audit entry for database error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 500, body: responseBody },
          startTime,
          data,
          updateError.message
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

    // Log audit entry (async, non-blocking)
    logAuditEntry(
      createAuditEntry(
        apiKeyId,
        organizationId,
        request,
        { status: 200, body: responseBody },
        startTime,
        data
      )
    )

    const response = NextResponse.json(responseBody, { status: 200 })

    addAgentApiHeaders(response.headers, requestId, rateLimit)
    return response
  } catch (error) {
    console.error('Error in campaign update endpoint:', error)

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

    if (error instanceof SyntaxError) {
      return createErrorResponse(
        'INVALID_JSON',
        'Invalid JSON in request body',
        400,
        undefined,
        requestId
      )
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    )
  }
}
