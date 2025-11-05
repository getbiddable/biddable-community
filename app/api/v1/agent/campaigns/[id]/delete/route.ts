import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'
import { logAuditEntry, createAuditEntry } from '@/lib/agent-audit-logger'

/**
 * DELETE /api/v1/agent/campaigns/[id]/delete
 * Delete a campaign permanently
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()

  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { apiKeyId, organizationId, requestId, rateLimit } = authResult

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

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check campaign exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('campaigns')
      .select('created_by, campaign_name')
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
          undefined,
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
          undefined,
          'Access forbidden to campaign'
        )
      )

      return response
    }

    // Delete campaign (cascade will delete related campaign_assets and campaign_audiences)
    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)

    if (deleteError) {
      console.error('Error deleting campaign:', deleteError)
      const response = createErrorResponse(
        'DATABASE_ERROR',
        'Failed to delete campaign',
        500,
        { error: deleteError.message },
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
          undefined,
          deleteError.message
        )
      )

      return response
    }

    const responseBody = {
      success: true,
      data: {
        campaign_id: campaignId,
        campaign_name: existing.campaign_name,
        message: 'Campaign deleted successfully',
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
        undefined
      )
    )

    const response = NextResponse.json(responseBody, { status: 200 })

    addAgentApiHeaders(response.headers, requestId, rateLimit)
    return response
  } catch (error) {
    console.error('Error in campaign delete endpoint:', error)

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

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    )
  }
}
