import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from './agent-api-keys'

/**
 * Agent API authentication result
 */
export interface AgentAuthContext {
  apiKeyId: string
  organizationId: string
  keyName: string
  permissions: Record<string, string[]>
  metadata: Record<string, any>
}

/**
 * Standard error response format for agent API
 */
export interface AgentErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
    request_id: string
  }
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

/**
 * Create a standard error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: any,
  requestId?: string
): NextResponse<AgentErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        request_id: requestId || generateRequestId(),
      },
    },
    { status }
  )
}

/**
 * Authenticate an agent API request using API key
 *
 * Usage:
 * ```typescript
 * const auth = await authenticateAgentRequest(request)
 * if (auth instanceof NextResponse) {
 *   return auth // Error response
 * }
 * // auth is AgentAuthContext
 * ```
 */
export async function authenticateAgentRequest(
  request: NextRequest
): Promise<AgentAuthContext | NextResponse<AgentErrorResponse>> {
  const requestId = generateRequestId()

  // Extract Authorization header
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return createErrorResponse(
      'UNAUTHORIZED',
      'Missing Authorization header',
      401,
      { expected_format: 'Authorization: Bearer <api-key>' },
      requestId
    )
  }

  // Parse Bearer token
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return createErrorResponse(
      'UNAUTHORIZED',
      'Invalid Authorization header format',
      401,
      { expected_format: 'Authorization: Bearer <api-key>', received: authHeader },
      requestId
    )
  }

  const apiKey = parts[1]

  if (!apiKey) {
    return createErrorResponse(
      'UNAUTHORIZED',
      'API key is empty',
      401,
      undefined,
      requestId
    )
  }

  // Validate API key
  try {
    const validation = await validateApiKey(apiKey)

    if (!validation.valid) {
      return createErrorResponse(
        'UNAUTHORIZED',
        validation.reason === 'expired'
          ? 'API key has expired'
          : 'Invalid API key',
        401,
        { reason: validation.reason },
        requestId
      )
    }

    // Return authentication context
    return {
      apiKeyId: validation.apiKey!.id,
      organizationId: validation.apiKey!.organizationId,
      keyName: validation.apiKey!.name,
      permissions: validation.apiKey!.permissions,
      metadata: validation.apiKey!.metadata,
    }
  } catch (error) {
    console.error('Error validating API key:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to validate API key',
      500,
      undefined,
      requestId
    )
  }
}

/**
 * Add standard headers to agent API responses
 */
export function addAgentApiHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitInfo?: {
    limit: number
    remaining: number
    reset: number
  }
): NextResponse {
  response.headers.set('X-Request-ID', requestId)

  if (rateLimitInfo) {
    response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString())
  }

  return response
}
