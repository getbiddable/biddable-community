import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from './agent-api-keys'
import { checkRateLimit, getActionFromPath, addRateLimitHeaders, type RateLimitResult } from './agent-rate-limiter'

/**
 * Agent API authentication result
 */
export interface AgentAuthContext {
  apiKeyId: string
  organizationId: string
  keyName: string
  permissions: Record<string, string[]>
  metadata: Record<string, any>
  requestId: string
  rateLimit?: RateLimitResult
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
 * const authResult = await authenticateAgentRequest(request)
 * if (!authResult.success) {
 *   return authResult.response // Error response
 * }
 * // Use authResult.organizationId, authResult.apiKeyId, etc.
 * ```
 */
export async function authenticateAgentRequest(
  request: NextRequest
): Promise<
  | { success: true; apiKeyId: string; organizationId: string; keyName: string; permissions: Record<string, string[]>; metadata: Record<string, any>; requestId: string; rateLimit: RateLimitResult }
  | { success: false; response: NextResponse<AgentErrorResponse> }
> {
  const requestId = generateRequestId()

  // Extract Authorization header
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return {
      success: false,
      response: createErrorResponse(
        'UNAUTHORIZED',
        'Missing Authorization header',
        401,
        { expected_format: 'Authorization: Bearer <api-key>' },
        requestId
      ),
    }
  }

  // Parse Bearer token
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      success: false,
      response: createErrorResponse(
        'UNAUTHORIZED',
        'Invalid Authorization header format',
        401,
        { expected_format: 'Authorization: Bearer <api-key>', received: authHeader },
        requestId
      ),
    }
  }

  const apiKey = parts[1]

  if (!apiKey) {
    return {
      success: false,
      response: createErrorResponse(
        'UNAUTHORIZED',
        'API key is empty',
        401,
        undefined,
        requestId
      ),
    }
  }

  // Validate API key
  try {
    const validation = await validateApiKey(apiKey)

    if (!validation.valid) {
      return {
        success: false,
        response: createErrorResponse(
          'UNAUTHORIZED',
          validation.reason === 'expired'
            ? 'API key has expired'
            : 'Invalid API key',
          401,
          { reason: validation.reason },
          requestId
        ),
      }
    }

    // Check rate limit
    const action = getActionFromPath(request.method, request.nextUrl.pathname)
    const rateLimitResult = await checkRateLimit(
      validation.apiKey!.id,
      action,
      validation.apiKey!.metadata
    )

    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded. Please try again later.',
        429,
        {
          limit: rateLimitResult.limit,
          reset: rateLimitResult.reset,
          retry_after: rateLimitResult.retryAfter,
          action,
        },
        requestId
      )

      // Add rate limit headers
      addRateLimitHeaders(response.headers, rateLimitResult)

      return {
        success: false,
        response,
      }
    }

    // Return authentication context with rate limit info
    return {
      success: true,
      apiKeyId: validation.apiKey!.id,
      organizationId: validation.apiKey!.organizationId,
      keyName: validation.apiKey!.name,
      permissions: validation.apiKey!.permissions,
      metadata: validation.apiKey!.metadata,
      requestId,
      rateLimit: rateLimitResult,
    }
  } catch (error) {
    console.error('Error validating API key:', error)
    return {
      success: false,
      response: createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to validate API key',
        500,
        undefined,
        requestId
      ),
    }
  }
}

/**
 * Add standard headers to agent API responses
 */
export function addAgentApiHeaders(
  headers: Headers,
  requestId: string,
  rateLimitInfo?: RateLimitResult
): void {
  headers.set('X-Request-ID', requestId)

  if (rateLimitInfo) {
    addRateLimitHeaders(headers, rateLimitInfo)
  }
}
