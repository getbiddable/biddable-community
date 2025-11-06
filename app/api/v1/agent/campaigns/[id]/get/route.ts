import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  addAgentApiHeaders,
  hasAgentPermission,
} from '@/lib/agent-api-middleware'
import {
  createUnknownErrorResponse,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  DatabaseError,
  createErrorResponse,
} from '@/lib/agent-api-errors'
import { logAuditEntry, createAuditEntry } from '@/lib/agent-audit-logger'

/**
 * GET /api/v1/agent/campaigns/[id]/get
 * Get a single campaign by ID with all details
 */
export async function GET(
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

  if (!hasAgentPermission(permissions, 'campaigns', 'read')) {
    const response = createErrorResponse(
      new ForbiddenError('API key is not authorized to read campaigns'),
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
        'Permission denied: campaigns.read'
      )
    )

    return response
  }

  try {
    const campaignId = parseInt(params.id)

    if (isNaN(campaignId)) {
      const errorBody = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid campaign ID',
        }
      }
      const response = createErrorResponse(
        new ValidationError('Invalid campaign ID', { id: params.id }),
        requestId
      )
      addAgentApiHeaders(response.headers, requestId, rateLimit)

      // Log audit entry for validation error
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 400, body: errorBody },
          startTime,
          undefined,
          'Invalid campaign ID'
        )
      )

      return response
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch campaign with related data
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        campaign_assets(
          id,
          assigned_at,
          asset_id,
          assets(*)
        ),
        campaign_audiences(
          id,
          assigned_at,
          audience_id,
          audiences(*)
        )
      `)
      .eq('id', campaignId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        const errorBody = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Campaign not found',
          }
        }
        const response = createErrorResponse(
          new NotFoundError('Campaign', campaignId),
          requestId
        )
        addAgentApiHeaders(response.headers, requestId, rateLimit)

        // Log audit entry for not found error
        logAuditEntry(
          createAuditEntry(
            apiKeyId,
            organizationId,
            request,
            { status: 404, body: errorBody },
            startTime,
            undefined,
            'Campaign not found'
          )
        )

        return response
      }

      console.error('Error fetching campaign:', error)
      const errorBody = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch campaign',
        }
      }
      const response = createErrorResponse(
        new DatabaseError('Failed to fetch campaign', { error: error.message }),
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

    // Verify campaign belongs to organization
    // Note: In current schema, created_by is user_id, not org_id
    // We need to verify the user belongs to the org
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', campaign.created_by)
      .single()

    if (orgError || userOrg?.organization_id !== organizationId) {
      const errorBody = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this campaign',
        }
      }
      const response = createErrorResponse(
        new ForbiddenError('You do not have access to this campaign', { campaign_id: campaignId }),
        requestId
      )
      addAgentApiHeaders(response.headers, requestId, rateLimit)

      // Log audit entry for forbidden error
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 403, body: errorBody },
          startTime,
          undefined,
          'Access forbidden to campaign'
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
    console.error('Error in campaign get endpoint:', error)
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
