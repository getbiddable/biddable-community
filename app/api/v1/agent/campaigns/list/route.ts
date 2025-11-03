import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'

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
  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { organizationId, requestId, rateLimit } = authResult

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const statusFilter = searchParams.get('status') || 'all'

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // First, get all user IDs in the organization
    const { data: orgUsers, error: orgError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)

    if (orgError) {
      console.error('Error fetching org users:', orgError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch organization users',
        500,
        { error: orgError.message },
        requestId
      )
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

    // Apply status filter
    if (statusFilter === 'active') {
      query = query.eq('status', true)
    } else if (statusFilter === 'inactive') {
      query = query.eq('status', false)
    }

    const { data: campaigns, error, count } = await query

    if (error) {
      console.error('Error fetching campaigns:', error)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch campaigns',
        500,
        { error: error.message },
        requestId
      )
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          campaigns: campaigns || [],
          pagination: {
            limit,
            offset,
            total: count || 0,
          },
        },
      },
      { status: 200 }
    )

    addAgentApiHeaders(response.headers, requestId, rateLimit)
    return response
  } catch (error) {
    console.error('Error in campaigns list endpoint:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    )
  }
}
