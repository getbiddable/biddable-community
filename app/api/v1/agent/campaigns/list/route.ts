import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'
import { CampaignListQuerySchema } from '@/lib/agent-api-schemas'
import {
  validateQueryParams,
  createValidationErrorResponse,
  createUnknownErrorResponse,
  DatabaseError,
  createErrorResponse,
} from '@/lib/agent-api-errors'
import { logAuditEntry, createAuditEntry } from '@/lib/agent-audit-logger'

/**
 * GET /api/v1/agent/campaigns/list
 * List all campaigns for the authenticated organization
 *
 * Query parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - status: 'active' | 'inactive' | 'all' (default: 'all')
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { apiKeyId, organizationId, requestId, rateLimit } = authResult

  try {
    // Validate query parameters with Zod schema
    const { searchParams } = new URL(request.url)
    const validation = validateQueryParams(searchParams, CampaignListQuerySchema)

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

    const { limit, offset, status } = validation.data

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // First, get all user IDs in the organization
    const { data: orgUsers, error: orgError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)

    if (orgError) {
      console.error('Error fetching org users:', orgError)
      const errorBody = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch organization users',
        }
      }
      const response = createErrorResponse(
        new DatabaseError('Failed to fetch organization users', { error: orgError.message }),
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
          undefined,
          orgError.message
        )
      )

      return response
    }

    const userIds = orgUsers.map(u => u.user_id)

    // Build query - filter by campaigns created by users in this org
    let query = supabase
      .from('campaigns')
      .select(`
        *,
        campaign_assets(count),
        campaign_audiences(count)
      `)
      .in('created_by', userIds) // Filter by organization's users
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter if provided
    if (status === 'active') {
      query = query.eq('status', true)
    } else if (status === 'inactive') {
      query = query.eq('status', false)
    }

    const { data: campaigns, error, count } = await query

    if (error) {
      console.error('Error fetching campaigns:', error)
      const errorBody = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch campaigns',
        }
      }
      const response = createErrorResponse(
        new DatabaseError('Failed to fetch campaigns', { error: error.message }),
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
          undefined,
          error.message
        )
      )

      return response
    }

    const responseBody = {
      success: true,
      data: {
        campaigns: campaigns || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
        },
      },
    }

    const response = NextResponse.json(responseBody, { status: 200 })

    addAgentApiHeaders(response.headers, requestId, rateLimit)

    // Log audit entry (async, non-blocking)
    logAuditEntry(
      createAuditEntry(
        apiKeyId,
        organizationId,
        request,
        { status: 200, body: responseBody },
        startTime
      )
    )

    return response
  } catch (error) {
    console.error('Error in campaigns list endpoint:', error)
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
