import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'
import {
  createUnknownErrorResponse,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  DatabaseError,
  createErrorResponse,
} from '@/lib/agent-api-errors'

/**
 * GET /api/v1/agent/campaigns/[id]/get
 * Get a single campaign by ID with all details
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
      const response = createErrorResponse(
        new ValidationError('Invalid campaign ID', { id: params.id }),
        requestId
      )
      addAgentApiHeaders(response.headers, requestId, rateLimit)
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
        const response = createErrorResponse(
          new NotFoundError('Campaign', campaignId),
          requestId
        )
        addAgentApiHeaders(response.headers, requestId, rateLimit)
        return response
      }

      console.error('Error fetching campaign:', error)
      const response = createErrorResponse(
        new DatabaseError('Failed to fetch campaign', { error: error.message }),
        requestId
      )
      addAgentApiHeaders(response.headers, requestId, rateLimit)
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
      const response = createErrorResponse(
        new ForbiddenError('You do not have access to this campaign', { campaign_id: campaignId }),
        requestId
      )
      addAgentApiHeaders(response.headers, requestId, rateLimit)
      return response
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

    addAgentApiHeaders(response.headers, requestId, rateLimit)
    return response
  } catch (error) {
    console.error('Error in campaign get endpoint:', error)
    const response = createUnknownErrorResponse(error, requestId)
    addAgentApiHeaders(response.headers, requestId, rateLimit)
    return response
  }
}
