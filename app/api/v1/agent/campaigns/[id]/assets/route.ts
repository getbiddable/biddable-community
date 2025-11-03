import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'

/**
 * GET /api/v1/agent/campaigns/[id]/assets
 * List all assets assigned to a campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {

  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { organizationId, requestId, rateLimit } = authResult

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

    if (orgError || userOrg?.organization_id !== organizationId) {
      return createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )
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
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch campaign assets',
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
          assets: assignments || [],
          count: assignments?.length || 0,
        },
      },
      { status: 200 }
    )

    addAgentApiHeaders(response.headers, requestId, rateLimit)
    return response
  } catch (error) {
    console.error('Error in campaign assets list endpoint:', error)
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

  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { organizationId, requestId, rateLimit } = authResult

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
    const { asset_id } = body

    if (!asset_id) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Asset ID is required',
        400,
        undefined,
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

    if (orgError || userOrg?.organization_id !== organizationId) {
      return createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )
    }

    // Verify asset exists and belongs to organization
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, organization_id')
      .eq('id', asset_id)
      .eq('organization_id', organizationId)
      .single()

    if (assetError || !asset) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Asset not found or does not belong to your organization',
        404,
        { asset_id },
        requestId
      )
    }

    // Get a user from the organization to use as assigned_by
    const { data: orgMember, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
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
        return createErrorResponse(
          'DUPLICATE_RESOURCE',
          'Asset is already assigned to this campaign',
          409,
          { campaign_id: campaignId, asset_id },
          requestId
        )
      }

      console.error('Error assigning asset:', insertError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to assign asset to campaign',
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
          message: 'Asset assigned to campaign successfully',
        },
      },
      { status: 201 }
    )

    addAgentApiHeaders(response.headers, requestId, rateLimit)
    return response
  } catch (error) {
    console.error('Error in campaign asset assign endpoint:', error)

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

  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { organizationId, requestId, rateLimit } = authResult

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
    const assetId = searchParams.get('asset_id')

    if (!assetId) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Asset ID is required',
        400,
        undefined,
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

    if (orgError || userOrg?.organization_id !== organizationId) {
      return createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )
    }

    // Unassign the asset
    const { error: deleteError } = await supabase
      .from('campaign_assets')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('asset_id', assetId)

    if (deleteError) {
      console.error('Error unassigning asset:', deleteError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to unassign asset from campaign',
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
          asset_id: assetId,
          message: 'Asset unassigned from campaign successfully',
        },
      },
      { status: 200 }
    )

    addAgentApiHeaders(response.headers, requestId, rateLimit)
    return response
  } catch (error) {
    console.error('Error in campaign asset unassign endpoint:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    )
  }
}
