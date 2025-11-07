import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  addAgentApiHeaders,
  hasAgentPermission,
} from '@/lib/agent-api-middleware'
import { logAuditEntry, createAuditEntry } from '@/lib/agent-audit-logger'

/**
 * GET /api/v1/agent/campaigns/[id]/assets
 * List all assets assigned to a campaign
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
      'FORBIDDEN',
      'API key is not authorized to read campaign assets',
      403,
      { resource: 'campaigns', action: 'read' },
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
      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid campaign ID',
        400,
        { id: params.id },
        requestId
      )

      // Log audit entry for error
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify campaign exists and belongs to organization
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('created_by')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      const response = createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Campaign not found',
        404,
        { campaign_id: campaignId },
        requestId
      )

      // Log audit entry for error
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

    // Verify campaign creator belongs to organization
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', campaign.created_by)
      .single()

    if (orgError || userOrg?.organization_id !== organizationId) {
      const response = createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 403, body: responseBody },
          startTime,
          undefined,
          'Forbidden: You do not have access to this campaign'
        )
      )

      return response
    }

    // Fetch assigned assets with full details
    const { data: assignments, error: assignmentsError } = await supabase
      .from('campaign_assets')
      .select(`
        id,
        assigned_at,
        asset_id,
        assets (
          id,
          name,
          type,
          format,
          size,
          file_url,
          status,
          ad_format,
          ad_data,
          created_at
        )
      `)
      .eq('campaign_id', campaignId)
      .order('assigned_at', { ascending: false })

    if (assignmentsError) {
      console.error('Error fetching campaign assets:', assignmentsError)
      const response = createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch campaign assets',
        500,
        { error: assignmentsError.message },
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 500, body: responseBody },
          startTime,
          undefined,
          'Failed to fetch campaign assets'
        )
      )

      return response
    }

    const responseBody = {
      success: true,
      data: {
        campaign_id: campaignId,
        assets: assignments || [],
        count: assignments?.length || 0,
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
    console.error('Error in campaign assets list endpoint:', error)

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

/**
 * POST /api/v1/agent/campaigns/[id]/assets
 * Assign an asset to a campaign
 *
 * Request body:
 * {
 *   asset_id: string (UUID)
 * }
 */
export async function POST(
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
      'API key is not authorized to modify campaign assets',
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

      // Log audit entry for error
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
    const { asset_id } = body

    if (!asset_id) {
      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Asset ID is required',
        400,
        undefined,
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 400, body: responseBody },
          startTime,
          body,
          'Asset ID is required'
        )
      )

      return response
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify campaign exists and belongs to organization
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('created_by')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      const response = createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Campaign not found',
        404,
        { campaign_id: campaignId },
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 404, body: responseBody },
          startTime,
          body,
          'Campaign not found'
        )
      )

      return response
    }

    // Verify campaign creator belongs to organization
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', campaign.created_by)
      .single()

    if (orgError || userOrg?.organization_id !== organizationId) {
      const response = createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 403, body: responseBody },
          startTime,
          body,
          'Forbidden: You do not have access to this campaign'
        )
      )

      return response
    }

    // Verify asset exists and belongs to organization
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, organization_id')
      .eq('id', asset_id)
      .eq('organization_id', organizationId)
      .single()

    if (assetError || !asset) {
      const response = createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Asset not found or does not belong to your organization',
        404,
        { asset_id },
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 404, body: responseBody },
          startTime,
          body,
          'Asset not found or does not belong to your organization'
        )
      )

      return response
    }

    // Get a user from the organization to use as assigned_by
    const { data: orgMember, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single()

    if (memberError || !orgMember) {
      const response = createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get organization user',
        500,
        { error: memberError?.message },
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 500, body: responseBody },
          startTime,
          body,
          'Failed to get organization user'
        )
      )

      return response
    }

    // Assign asset to campaign
    const { data: assignment, error: insertError } = await supabase
      .from('campaign_assets')
      .insert({
        campaign_id: campaignId,
        asset_id: asset_id,
        assigned_by: orgMember.user_id,
      })
      .select()
      .single()

    if (insertError) {
      // Check if it's a duplicate error
      if (insertError.code === '23505') {
        const response = createErrorResponse(
          'DUPLICATE_RESOURCE',
          'Asset is already assigned to this campaign',
          409,
          { campaign_id: campaignId, asset_id },
          requestId
        )

        // Log audit entry for error
        const responseBody = await response.clone().json()
        logAuditEntry(
          createAuditEntry(
            apiKeyId,
            organizationId,
            request,
            { status: 409, body: responseBody },
            startTime,
            body,
            'Asset is already assigned to this campaign'
          )
        )

        return response
      }

      console.error('Error assigning asset:', insertError)
      const response = createErrorResponse(
        'DATABASE_ERROR',
        'Failed to assign asset to campaign',
        500,
        { error: insertError.message },
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 500, body: responseBody },
          startTime,
          body,
          'Failed to assign asset to campaign'
        )
      )

      return response
    }

    const responseBody = {
      success: true,
      data: {
        assignment,
        message: 'Asset assigned to campaign successfully',
      },
    }

    // Log audit entry (async, non-blocking)
    logAuditEntry(
      createAuditEntry(
        apiKeyId,
        organizationId,
        request,
        { status: 201, body: responseBody },
        startTime,
        body
      )
    )

    const response = NextResponse.json(responseBody, { status: 201 })

    addAgentApiHeaders(response.headers, requestId, rateLimit)
    return response
  } catch (error) {
    console.error('Error in campaign asset assign endpoint:', error)

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
      const response = createErrorResponse(
        'INVALID_JSON',
        'Invalid JSON in request body',
        400,
        undefined,
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 400, body: responseBody },
          startTime,
          undefined,
          'Invalid JSON in request body'
        )
      )

      return response
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

/**
 * DELETE /api/v1/agent/campaigns/[id]/assets
 * Unassign an asset from a campaign
 *
 * Query parameters:
 * - asset_id: string (UUID)
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

  const { apiKeyId, organizationId, requestId, rateLimit, permissions } = authResult

  if (!hasAgentPermission(permissions, 'campaigns', 'write')) {
    const response = createErrorResponse(
      'FORBIDDEN',
      'API key is not authorized to modify campaign assets',
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

      // Log audit entry for error
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

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('asset_id')

    if (!assetId) {
      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Asset ID is required',
        400,
        undefined,
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 400, body: responseBody },
          startTime,
          undefined,
          'Asset ID is required'
        )
      )

      return response
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify campaign exists and belongs to organization
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('created_by')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      const response = createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Campaign not found',
        404,
        { campaign_id: campaignId },
        requestId
      )

      // Log audit entry for error
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

    // Verify campaign creator belongs to organization
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', campaign.created_by)
      .single()

    if (orgError || userOrg?.organization_id !== organizationId) {
      const response = createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 403, body: responseBody },
          startTime,
          undefined,
          'Forbidden: You do not have access to this campaign'
        )
      )

      return response
    }

    // Unassign the asset
    const { error: deleteError } = await supabase
      .from('campaign_assets')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('asset_id', assetId)

    if (deleteError) {
      console.error('Error unassigning asset:', deleteError)
      const response = createErrorResponse(
        'DATABASE_ERROR',
        'Failed to unassign asset from campaign',
        500,
        { error: deleteError.message },
        requestId
      )

      // Log audit entry for error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 500, body: responseBody },
          startTime,
          undefined,
          'Failed to unassign asset from campaign'
        )
      )

      return response
    }

    const responseBody = {
      success: true,
      data: {
        campaign_id: campaignId,
        asset_id: assetId,
        message: 'Asset unassigned from campaign successfully',
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
    console.error('Error in campaign asset unassign endpoint:', error)

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
