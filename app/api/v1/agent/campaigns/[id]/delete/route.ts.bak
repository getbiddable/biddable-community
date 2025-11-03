import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'

/**
 * DELETE /api/v1/agent/campaigns/[id]/delete
 * Delete a campaign permanently
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

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check campaign exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('campaigns')
      .select('created_by, campaign_name')
      .eq('id', campaignId)
      .single()

    if (fetchError || !existing) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Campaign not found',
        404,
        { campaign_id: campaignId },
        requestId
      )
    }

    // Verify user belongs to same org
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', existing.created_by)
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

    // Delete campaign (cascade will delete related campaign_assets and campaign_audiences)
    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)

    if (deleteError) {
      console.error('Error deleting campaign:', deleteError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to delete campaign',
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
          campaign_name: existing.campaign_name,
          message: 'Campaign deleted successfully',
        },
      },
      { status: 200 }
    )

    return addAgentApiHeaders(response, requestId)
  } catch (error) {
    console.error('Error in campaign delete endpoint:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    )
  }
}
