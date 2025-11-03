import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'

/**
 * GET /api/v1/agent/assets/list
 * List all assets for the authenticated organization
 *
 * Query parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - type: 'image' | 'video' | 'text' | 'reddit_ad' | 'all' (default: 'all')
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
    const typeFilter = searchParams.get('type') || 'all'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Build query - filter by organization
    let query = supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply type filter
    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter)
    }

    const { data: assets, error, count } = await query

    if (error) {
      console.error('Error fetching assets:', error)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch assets',
        500,
        { error: error.message },
        requestId
      )
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          assets: assets || [],
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
    console.error('Error in assets list endpoint:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    )
  }
}
