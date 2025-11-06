import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  addAgentApiHeaders,
  hasAgentPermission,
} from '@/lib/agent-api-middleware'
import {
  createUnknownErrorResponse,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  DatabaseError,
  createErrorResponse,
} from '@/lib/agent-api-errors'
import { logAuditEntry, createAuditEntry } from '@/lib/agent-audit-logger'

/**
 * GET /api/v1/agent/assets/[id]/get
 * Get a single asset by ID with all details
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

  const { apiKeyId, organizationId, requestId, rateLimit, permissions } = authResult

  if (!hasAgentPermission(permissions, 'assets', 'read')) {
    const response = createErrorResponse(
      new ForbiddenError('API key is not authorized to read assets'),
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
    const assetId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(assetId)) {
      const errorBody = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid asset ID format',
        }
      }
      const response = createErrorResponse(
        new ValidationError('Invalid asset ID format - must be a valid UUID', { id: params.id }),
        requestId
      )
      addAgentApiHeaders(response.headers, requestId, rateLimit)

      // Log audit entry for validation error
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 400, body: errorBody },
          startTime,
          undefined,
          'Invalid asset ID format'
        )
      )

      return response
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch asset with organization check
    const { data: asset, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        const errorBody = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Asset not found or does not belong to your organization',
          }
        }
        const response = createErrorResponse(
          new NotFoundError('Asset', assetId),
          requestId
        )
        addAgentApiHeaders(response.headers, requestId, rateLimit)

        // Log audit entry for not found error
        logAuditEntry(
          createAuditEntry(
            apiKeyId,
            organizationId,
            request,
            { status: 404, body: errorBody },
            startTime,
            undefined,
            'Asset not found'
          )
        )

        return response
      }

      console.error('Error fetching asset:', error)
      const errorBody = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch asset',
        }
      }
      const response = createErrorResponse(
        new DatabaseError('Failed to fetch asset', { error: error.message }),
        requestId
      )
      addAgentApiHeaders(response.headers, requestId, rateLimit)

      // Log audit entry for database error
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 500, body: errorBody },
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
        asset,
      },
    }

    const response = NextResponse.json(responseBody, { status: 200 })

    addAgentApiHeaders(response.headers, requestId, rateLimit)

    // Log audit entry (async, non-blocking)
    logAuditEntry(
      createAuditEntry(
        apiKeyId,
        organizationId,
        request,
        { status: 200, body: responseBody },
        startTime
      )
    )

    return response
  } catch (error) {
    console.error('Error in asset get endpoint:', error)
    const response = createUnknownErrorResponse(error, requestId)
    addAgentApiHeaders(response.headers, requestId, rateLimit)

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

    return response
  }
}
