import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'

/**
 * GET /api/v1/agent/campaigns/[id]/get
 * Get a single campaign by ID with all details
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
        return createErrorResponse(
          'RESOURCE_NOT_FOUND',
          'Campaign not found',
          404,
          { campaign_id: campaignId },
          requestId
        )
      }

      console.error('Error fetching campaign:', error)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch campaign',
        500,
        { error: error.message },
        requestId
      )
    }

    // Verify campaign belongs to organization
    // Note: In current schema, created_by is user_id, not org_id
    // We need to verify the user belongs to the org
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

    const response = NextResponse.json(
      {
        success: true,
        data: {
          campaign,
        },
      },
      { status: 200 }
    )

    return addAgentApiHeaders(response, requestId)
  } catch (error) {
    console.error('Error in campaign get endpoint:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    )
  }
}
