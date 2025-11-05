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
 * GET /api/v1/agent/campaigns/[id]/audiences
 * List all audiences assigned to a campaign
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

    // Fetch assigned audiences with full details
    const { data: assignments, error: assignmentsError } = await supabase
      .from('campaign_audiences')
      .select(`
        id,
        assigned_at,
        audience_id,
        audiences (
          id,
          name,
          description,
          age_min,
          age_max,
          genders,
          locations,
          interests,
          behaviors,
          estimated_size,
          status,
          created_at
        )
      `)
      .eq('campaign_id', campaignId)
      .order('assigned_at', { ascending: false })

    if (assignmentsError) {
      console.error('Error fetching campaign audiences:', assignmentsError)
      const response = createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch campaign audiences',
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
          'Failed to fetch campaign audiences'
        )
      )

      return response
    }

    const responseBody = {
      success: true,
      data: {
        campaign_id: campaignId,
        audiences: assignments || [],
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
    console.error('Error in campaign audiences list endpoint:', error)

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
 * POST /api/v1/agent/campaigns/[id]/audiences
 * Assign an audience to a campaign
 *
 * Request body:
 * {
 *   audience_id: number
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
    const { audience_id } = body

    if (!audience_id) {
      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Audience ID is required',
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
          'Audience ID is required'
        )
      )

      return response
    }

    const audienceId = parseInt(audience_id)
    if (isNaN(audienceId)) {
      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Audience ID must be a number',
        400,
        { audience_id },
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
          'Audience ID must be a number'
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

    // Verify audience exists and belongs to organization
    const { data: audience, error: audienceError } = await supabase
      .from('audiences')
      .select('id, organization_id')
      .eq('id', audienceId)
      .eq('organization_id', organizationId)
      .single()

    if (audienceError || !audience) {
      const response = createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Audience not found or does not belong to your organization',
        404,
        { audience_id: audienceId },
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
          'Audience not found or does not belong to your organization'
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

    // Assign audience to campaign
    const { data: assignment, error: insertError } = await supabase
      .from('campaign_audiences')
      .insert({
        campaign_id: campaignId,
        audience_id: audienceId,
        assigned_by: orgMember.user_id,
      })
      .select()
      .single()

    if (insertError) {
      // Check if it's a duplicate error
      if (insertError.code === '23505') {
        const response = createErrorResponse(
          'DUPLICATE_RESOURCE',
          'Audience is already assigned to this campaign',
          409,
          { campaign_id: campaignId, audience_id: audienceId },
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
            'Audience is already assigned to this campaign'
          )
        )

        return response
      }

      console.error('Error assigning audience:', insertError)
      const response = createErrorResponse(
        'DATABASE_ERROR',
        'Failed to assign audience to campaign',
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
          'Failed to assign audience to campaign'
        )
      )

      return response
    }

    const responseBody = {
      success: true,
      data: {
        assignment,
        message: 'Audience assigned to campaign successfully',
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
    console.error('Error in campaign audience assign endpoint:', error)

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
 * DELETE /api/v1/agent/campaigns/[id]/audiences
 * Unassign an audience from a campaign
 *
 * Query parameters:
 * - audience_id: number
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
    const audienceIdParam = searchParams.get('audience_id')

    if (!audienceIdParam) {
      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Audience ID is required',
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
          'Audience ID is required'
        )
      )

      return response
    }

    const audienceId = parseInt(audienceIdParam)
    if (isNaN(audienceId)) {
      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Audience ID must be a number',
        400,
        { audience_id: audienceIdParam },
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
          'Audience ID must be a number'
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

    // Unassign the audience
    const { error: deleteError } = await supabase
      .from('campaign_audiences')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('audience_id', audienceId)

    if (deleteError) {
      console.error('Error unassigning audience:', deleteError)
      const response = createErrorResponse(
        'DATABASE_ERROR',
        'Failed to unassign audience from campaign',
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
          'Failed to unassign audience from campaign'
        )
      )

      return response
    }

    const responseBody = {
      success: true,
      data: {
        campaign_id: campaignId,
        audience_id: audienceId,
        message: 'Audience unassigned from campaign successfully',
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
    console.error('Error in campaign audience unassign endpoint:', error)

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
