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
 * GET /api/v1/agent/audiences/[id]/get
 * Get a single audience by ID with all details
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

  if (!hasAgentPermission(permissions, 'audiences', 'read')) {
    const response = createErrorResponse(
      new ForbiddenError('API key is not authorized to read audiences'),
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
        'Permission denied: audiences.read'
      )
    )

    return response
  }

  try {
    const audienceId = parseInt(params.id)

    if (isNaN(audienceId)) {
      const errorBody = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid audience ID',
        }
      }
      const response = createErrorResponse(
        new ValidationError('Invalid audience ID - must be a number', { id: params.id }),
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
          'Invalid audience ID'
        )
      )

      return response
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch audience with organization check
    const { data: audience, error } = await supabase
      .from('audiences')
      .select('*')
      .eq('id', audienceId)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        const errorBody = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Audience not found or does not belong to your organization',
          }
        }
        const response = createErrorResponse(
          new NotFoundError('Audience', audienceId),
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
            'Audience not found'
          )
        )

        return response
      }

      console.error('Error fetching audience:', error)
      const errorBody = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch audience',
        }
      }
      const response = createErrorResponse(
        new DatabaseError('Failed to fetch audience', { error: error.message }),
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
        audience,
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
    console.error('Error in audience get endpoint:', error)
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
