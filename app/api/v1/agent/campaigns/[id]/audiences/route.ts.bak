import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'

/**
 * GET /api/v1/agent/campaigns/[id]/audiences
 * List all audiences assigned to a campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = generateRequestId()

  // Authenticate request
  const auth = await authenticateAgentRequest(request)
  if (auth instanceof NextResponse) {
    return auth // Error response
  }

  try {
    const campaignId = parseInt(params.id)

    if (isNaN(campaignId)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid campaign ID',
        400,
        { id: params.id },
        requestId
      )
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
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Campaign not found',
        404,
        { campaign_id: campaignId },
        requestId
      )
    }

    // Verify campaign creator belongs to organization
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', campaign.created_by)
      .single()

    if (orgError || userOrg?.organization_id !== auth.organizationId) {
      return createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )
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
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch campaign audiences',
        500,
        { error: assignmentsError.message },
        requestId
      )
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          campaign_id: campaignId,
          audiences: assignments || [],
          count: assignments?.length || 0,
        },
      },
      { status: 200 }
    )

    return addAgentApiHeaders(response, requestId)
  } catch (error) {
    console.error('Error in campaign audiences list endpoint:', error)
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
  const requestId = generateRequestId()

  // Authenticate request
  const auth = await authenticateAgentRequest(request)
  if (auth instanceof NextResponse) {
    return auth // Error response
  }

  try {
    const campaignId = parseInt(params.id)

    if (isNaN(campaignId)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid campaign ID',
        400,
        { id: params.id },
        requestId
      )
    }

    // Parse request body
    const body = await request.json()
    const { audience_id } = body

    if (!audience_id) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Audience ID is required',
        400,
        undefined,
        requestId
      )
    }

    const audienceId = parseInt(audience_id)
    if (isNaN(audienceId)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Audience ID must be a number',
        400,
        { audience_id },
        requestId
      )
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
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Campaign not found',
        404,
        { campaign_id: campaignId },
        requestId
      )
    }

    // Verify campaign creator belongs to organization
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', campaign.created_by)
      .single()

    if (orgError || userOrg?.organization_id !== auth.organizationId) {
      return createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )
    }

    // Verify audience exists and belongs to organization
    const { data: audience, error: audienceError } = await supabase
      .from('audiences')
      .select('id, organization_id')
      .eq('id', audienceId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (audienceError || !audience) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Audience not found or does not belong to your organization',
        404,
        { audience_id: audienceId },
        requestId
      )
    }

    // Get a user from the organization to use as assigned_by
    const { data: orgMember, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', auth.organizationId)
      .limit(1)
      .single()

    if (memberError || !orgMember) {
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get organization user',
        500,
        { error: memberError?.message },
        requestId
      )
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
        return createErrorResponse(
          'DUPLICATE_RESOURCE',
          'Audience is already assigned to this campaign',
          409,
          { campaign_id: campaignId, audience_id: audienceId },
          requestId
        )
      }

      console.error('Error assigning audience:', insertError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to assign audience to campaign',
        500,
        { error: insertError.message },
        requestId
      )
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          assignment,
          message: 'Audience assigned to campaign successfully',
        },
      },
      { status: 201 }
    )

    return addAgentApiHeaders(response, requestId)
  } catch (error) {
    console.error('Error in campaign audience assign endpoint:', error)

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
  const requestId = generateRequestId()

  // Authenticate request
  const auth = await authenticateAgentRequest(request)
  if (auth instanceof NextResponse) {
    return auth // Error response
  }

  try {
    const campaignId = parseInt(params.id)

    if (isNaN(campaignId)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid campaign ID',
        400,
        { id: params.id },
        requestId
      )
    }

    const { searchParams } = new URL(request.url)
    const audienceIdParam = searchParams.get('audience_id')

    if (!audienceIdParam) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Audience ID is required',
        400,
        undefined,
        requestId
      )
    }

    const audienceId = parseInt(audienceIdParam)
    if (isNaN(audienceId)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Audience ID must be a number',
        400,
        { audience_id: audienceIdParam },
        requestId
      )
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
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Campaign not found',
        404,
        { campaign_id: campaignId },
        requestId
      )
    }

    // Verify campaign creator belongs to organization
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', campaign.created_by)
      .single()

    if (orgError || userOrg?.organization_id !== auth.organizationId) {
      return createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )
    }

    // Unassign the audience
    const { error: deleteError } = await supabase
      .from('campaign_audiences')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('audience_id', audienceId)

    if (deleteError) {
      console.error('Error unassigning audience:', deleteError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to unassign audience from campaign',
        500,
        { error: deleteError.message },
        requestId
      )
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          campaign_id: campaignId,
          audience_id: audienceId,
          message: 'Audience unassigned from campaign successfully',
        },
      },
      { status: 200 }
    )

    return addAgentApiHeaders(response, requestId)
  } catch (error) {
    console.error('Error in campaign audience unassign endpoint:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    )
  }
}
