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
 * GET /api/v1/agent/assets/list
 * List all assets for the authenticated organization
 *
 * Query parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - type: 'image' | 'video' | 'text' | 'reddit_ad' | 'all' (default: 'all')
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { apiKeyId, organizationId, requestId, rateLimit, permissions } = authResult

  if (!hasAgentPermission(permissions, 'assets', 'read')) {
    const response = createErrorResponse(
      'FORBIDDEN',
      'API key is not authorized to read assets',
      403,
      { resource: 'assets', action: 'read' },
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
        'Permission denied: assets.read'
      )
    )

    return response
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
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply type filter
    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter)
    }

    const { data: assets, error, count } = await query

    if (error) {
      console.error('Error fetching assets:', error)
      const response = createErrorResponse(
        'DATABASE_ERROR',
        'Failed to fetch assets',
        500,
        { error: error.message },
        requestId
      )

      // Log audit entry for database error
      const responseBody = await response.clone().json()
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 500, body: responseBody },
          startTime,
          undefined,
          error.message
        )
      )

      return response
    }

    const responseBody = {
      success: true,
      data: {
        assets: assets || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
        },
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
    console.error('Error in assets list endpoint:', error)

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
