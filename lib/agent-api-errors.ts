/**
 * Standardized error handling for Agent API
 *
 * Provides consistent error codes, messages, and response formatting
 * across all agent API endpoints.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Standard error codes for agent API
 */
export enum AgentErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_API_KEY = 'INVALID_API_KEY',
  API_KEY_EXPIRED = 'API_KEY_EXPIRED',

  // Rate Limiting & Budget
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',

  // Resources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Database & System
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// ============================================================================
// ERROR RESPONSE TYPES
// ============================================================================

/**
 * Standard error response structure
 */
export interface AgentErrorResponse {
  success: false
  error: {
    code: AgentErrorCode
    message: string
    details?: Record<string, any>
    timestamp: string
    request_id?: string
  }
}

/**
 * Zod validation error details
 */
export interface ValidationErrorDetails {
  field: string
  message: string
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base class for agent API errors
 */
export class AgentApiError extends Error {
  constructor(
    public code: AgentErrorCode,
    public message: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'AgentApiError'
  }
}

/**
 * Authentication error (401)
 */
export class UnauthorizedError extends AgentApiError {
  constructor(message: string = 'Invalid or missing API key', details?: Record<string, any>) {
    super(AgentErrorCode.UNAUTHORIZED, message, 401, details)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Permission error (403)
 */
export class ForbiddenError extends AgentApiError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, any>) {
    super(AgentErrorCode.FORBIDDEN, message, 403, details)
    this.name = 'ForbiddenError'
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AgentApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(AgentErrorCode.VALIDATION_ERROR, message, 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends AgentApiError {
  constructor(resource: string, id?: string | number) {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`
    super(AgentErrorCode.RESOURCE_NOT_FOUND, message, 404, { resource, id })
    this.name = 'NotFoundError'
  }
}

/**
 * Duplicate resource error (409)
 */
export class ConflictError extends AgentApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(AgentErrorCode.DUPLICATE_RESOURCE, message, 409, details)
    this.name = 'ConflictError'
  }
}

/**
 * Budget exceeded error (400)
 */
export class BudgetExceededError extends AgentApiError {
  constructor(details: {
    monthly_limit: number
    current_total: number
    requested: number
    available: number
    affected_month?: string
    campaigns?: Array<{ id: number; name: string; budget: number }>
  }) {
    super(
      AgentErrorCode.BUDGET_EXCEEDED,
      `Campaign budget exceeds monthly limit of $${details.monthly_limit.toLocaleString()}`,
      400,
      details
    )
    this.name = 'BudgetExceededError'
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class RateLimitError extends AgentApiError {
  constructor(details: {
    limit: number
    window: number
    retry_after: number
  }) {
    super(
      AgentErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.',
      429,
      details
    )
    this.name = 'RateLimitError'
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AgentApiError {
  constructor(message: string = 'Database operation failed', details?: Record<string, any>) {
    super(AgentErrorCode.DATABASE_ERROR, message, 500, details)
    this.name = 'DatabaseError'
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends AgentApiError {
  constructor(message: string = 'Internal server error', details?: Record<string, any>) {
    super(AgentErrorCode.INTERNAL_ERROR, message, 500, details)
    this.name = 'InternalError'
  }
}

// ============================================================================
// ERROR FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format Zod validation errors into readable format
 */
export function formatZodError(error: ZodError): ValidationErrorDetails[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message
  }))
}

/**
 * Create error response from AgentApiError
 */
export function createErrorResponse(
  error: AgentApiError,
  requestId?: string
): NextResponse<AgentErrorResponse> {
  const response: AgentErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      request_id: requestId
    }
  }

  return NextResponse.json(response, { status: error.statusCode })
}

/**
 * Create error response from Zod validation error
 */
export function createValidationErrorResponse(
  zodError: ZodError,
  requestId?: string
): NextResponse<AgentErrorResponse> {
  const validationErrors = formatZodError(zodError)

  const response: AgentErrorResponse = {
    success: false,
    error: {
      code: AgentErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      details: {
        errors: validationErrors
      },
      timestamp: new Date().toISOString(),
      request_id: requestId
    }
  }

  return NextResponse.json(response, { status: 400 })
}

/**
 * Create error response from unknown error
 */
export function createUnknownErrorResponse(
  error: unknown,
  requestId?: string
): NextResponse<AgentErrorResponse> {
  console.error('Unknown error in agent API:', error)

  // If it's a Zod error
  if (error instanceof ZodError) {
    return createValidationErrorResponse(error, requestId)
  }

  // If it's already an AgentApiError
  if (error instanceof AgentApiError) {
    return createErrorResponse(error, requestId)
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'

  const response: AgentErrorResponse = {
    success: false,
    error: {
      code: AgentErrorCode.INTERNAL_ERROR,
      message,
      timestamp: new Date().toISOString(),
      request_id: requestId
    }
  }

  return NextResponse.json(response, { status: 500 })
}

// ============================================================================
// ERROR MESSAGE HELPERS
// ============================================================================

/**
 * Common error messages
 */
export const ErrorMessages = {
  INVALID_API_KEY: 'Invalid or missing API key',
  API_KEY_EXPIRED: 'API key has expired',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to perform this action',
  VALIDATION_ERROR: 'Invalid input data',
  CAMPAIGN_NOT_FOUND: 'Campaign not found',
  ASSET_NOT_FOUND: 'Asset not found',
  AUDIENCE_NOT_FOUND: 'Audience not found',
  RESOURCE_ALREADY_EXISTS: 'Resource already exists',
  BUDGET_EXCEEDED: 'Monthly budget limit exceeded',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down.',
  DATABASE_ERROR: 'Database operation failed',
  INTERNAL_ERROR: 'An unexpected error occurred'
} as const

/**
 * Get HTTP status code for error code
 */
export function getStatusCodeForError(code: AgentErrorCode): number {
  const statusCodeMap: Record<AgentErrorCode, number> = {
    [AgentErrorCode.UNAUTHORIZED]: 401,
    [AgentErrorCode.FORBIDDEN]: 403,
    [AgentErrorCode.INVALID_API_KEY]: 401,
    [AgentErrorCode.API_KEY_EXPIRED]: 401,
    [AgentErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    [AgentErrorCode.BUDGET_EXCEEDED]: 400,
    [AgentErrorCode.VALIDATION_ERROR]: 400,
    [AgentErrorCode.INVALID_INPUT]: 400,
    [AgentErrorCode.INVALID_DATE_RANGE]: 400,
    [AgentErrorCode.RESOURCE_NOT_FOUND]: 404,
    [AgentErrorCode.DUPLICATE_RESOURCE]: 409,
    [AgentErrorCode.RESOURCE_CONFLICT]: 409,
    [AgentErrorCode.DATABASE_ERROR]: 500,
    [AgentErrorCode.INTERNAL_ERROR]: 500,
    [AgentErrorCode.SERVICE_UNAVAILABLE]: 503
  }

  return statusCodeMap[code] || 500
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Safely parse and validate request body with Zod schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: any
): Promise<{ success: true; data: T } | { success: false; error: ZodError }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true, data: result.data }
  } catch (error) {
    // If JSON parsing fails, create a Zod-like error
    throw new ValidationError('Invalid JSON in request body')
  }
}

/**
 * Safely parse and validate query parameters with Zod schema
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: any
): { success: true; data: T } | { success: false; error: ZodError } {
  const params: Record<string, any> = {}

  // Convert URLSearchParams to object and parse numbers
  searchParams.forEach((value, key) => {
    // Try to parse as number if it looks like one
    const numValue = Number(value)
    params[key] = isNaN(numValue) ? value : numValue
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data }
}
