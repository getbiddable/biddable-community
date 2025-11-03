import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'

/**
 * GET /api/v1/agent/audiences/list
 * List all audiences for the authenticated organization
 *
 * Query parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - status: 'active' | 'archived' | 'all' (default: 'active')
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()

  // Authenticate request
  const auth = await authenticateAgentRequest(request)
  if (auth instanceof NextResponse) {
    return auth // Error response
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const statusFilter = searchParams.get('status') || 'active'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Build query - filter by organization
    let query = supabase
      .from('audiences')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: audiences, error, count } = await query

    if (error) {
      console.error('Error fetching audiences:', error)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch audiences',
        500,
        { error: error.message },
        requestId
      )
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          audiences: audiences || [],
          pagination: {
            limit,
            offset,
            total: count || 0,
          },
        },
      },
      { status: 200 }
    )

    return addAgentApiHeaders(response, requestId)
  } catch (error) {
    console.error('Error in audiences list endpoint:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    )
  }
}
