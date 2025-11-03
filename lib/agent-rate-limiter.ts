/**
 * Agent API Rate Limiting System
 *
 * Implements token bucket algorithm for rate limiting agent API requests.
 * Tracks requests per API key with configurable limits per endpoint type.
 */

import { createClient } from '@supabase/supabase-js'

// Rate limit configuration
export const RATE_LIMITS = {
  global: { requests: 1000, window: 3600 }, // 1000 requests per hour
  'campaigns.create': { requests: 10, window: 3600 }, // 10 per hour
  'campaigns.update': { requests: 50, window: 3600 }, // 50 per hour
  'campaigns.delete': { requests: 10, window: 3600 }, // 10 per hour
  'campaigns.list': { requests: 200, window: 3600 }, // 200 per hour
  'assets.create': { requests: 50, window: 3600 }, // 50 per hour
  'assets.list': { requests: 200, window: 3600 }, // 200 per hour
  'audiences.create': { requests: 50, window: 3600 }, // 50 per hour
  'audiences.list': { requests: 200, window: 3600 }, // 200 per hour
  'ai.generate': { requests: 10, window: 3600 }, // 10 per hour (expensive)
} as const

type RateLimitKey = keyof typeof RATE_LIMITS

interface RateLimitBucket {
  tokens: number
  lastRefill: number
  requests: number[]
}

// In-memory storage for rate limit buckets
// In production, consider using Redis for distributed rate limiting
const buckets = new Map<string, RateLimitBucket>()

/**
 * Get the rate limit configuration for an endpoint
 */
function getRateLimitConfig(action: string): { requests: number; window: number } {
  // Try to match specific action first
  if (action in RATE_LIMITS) {
    return RATE_LIMITS[action as RateLimitKey]
  }

  // Fall back to global limit
  return RATE_LIMITS.global
}

/**
 * Get custom rate limits from API key metadata
 */
function getCustomLimits(metadata: any, action: string): { requests: number; window: number } | null {
  if (!metadata || !metadata.rate_limits) {
    return null
  }

  const customLimit = metadata.rate_limits[action] || metadata.rate_limits.global
  if (customLimit) {
    return {
      requests: customLimit.requests || RATE_LIMITS.global.requests,
      window: customLimit.window || RATE_LIMITS.global.window,
    }
  }

  return null
}

/**
 * Create a unique bucket key for API key + action combination
 */
function getBucketKey(apiKeyId: string, action: string): string {
  return `${apiKeyId}:${action}`
}

/**
 * Get or create a rate limit bucket
 */
function getBucket(key: string): RateLimitBucket {
  if (!buckets.has(key)) {
    buckets.set(key, {
      tokens: 0,
      lastRefill: Date.now(),
      requests: [],
    })
  }
  return buckets.get(key)!
}

/**
 * Refill tokens based on time elapsed (token bucket algorithm)
 */
function refillTokens(bucket: RateLimitBucket, limit: { requests: number; window: number }): void {
  const now = Date.now()
  const elapsed = now - bucket.lastRefill
  const refillRate = limit.requests / limit.window // tokens per millisecond
  const tokensToAdd = Math.floor(elapsed * refillRate)

  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(limit.requests, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now
  }
}

/**
 * Clean up old request timestamps outside the time window
 */
function cleanupRequests(bucket: RateLimitBucket, windowMs: number): void {
  const now = Date.now()
  const cutoff = now - windowMs * 1000
  bucket.requests = bucket.requests.filter(timestamp => timestamp > cutoff)
}

/**
 * Check if request is allowed and consume a token
 */
export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when limit resets
  retryAfter?: number // Seconds to wait before retrying
}

export async function checkRateLimit(
  apiKeyId: string,
  action: string,
  metadata?: any
): Promise<RateLimitResult> {
  // Get rate limit configuration (custom or default)
  const customLimit = getCustomLimits(metadata, action)
  const limit = customLimit || getRateLimitConfig(action)

  // Check both global and action-specific limits
  const checks = [
    { key: getBucketKey(apiKeyId, 'global'), limit: RATE_LIMITS.global },
    { key: getBucketKey(apiKeyId, action), limit },
  ]

  const now = Date.now()

  for (const check of checks) {
    const bucket = getBucket(check.key)

    // Clean up old requests
    cleanupRequests(bucket, check.limit.window)

    // Add current request to tracking
    bucket.requests.push(now)

    // Check if we've exceeded the limit
    if (bucket.requests.length > check.limit.requests) {
      // Rate limit exceeded
      const oldestRequest = bucket.requests[0]
      const resetTime = oldestRequest + check.limit.window * 1000
      const retryAfter = Math.ceil((resetTime - now) / 1000)

      // Remove the request we just added since it's not allowed
      bucket.requests.pop()

      return {
        allowed: false,
        limit: check.limit.requests,
        remaining: 0,
        reset: Math.floor(resetTime / 1000),
        retryAfter,
      }
    }
  }

  // All checks passed
  const actionBucket = getBucket(getBucketKey(apiKeyId, action))
  const remaining = limit.requests - actionBucket.requests.length
  const oldestRequest = actionBucket.requests[0] || now
  const resetTime = oldestRequest + limit.window * 1000

  return {
    allowed: true,
    limit: limit.requests,
    remaining: Math.max(0, remaining),
    reset: Math.floor(resetTime / 1000),
  }
}

/**
 * Get current rate limit status without consuming a token
 */
export async function getRateLimitStatus(
  apiKeyId: string,
  action: string,
  metadata?: any
): Promise<RateLimitResult> {
  const customLimit = getCustomLimits(metadata, action)
  const limit = customLimit || getRateLimitConfig(action)
  const key = getBucketKey(apiKeyId, action)
  const bucket = getBucket(key)

  cleanupRequests(bucket, limit.window)

  const now = Date.now()
  const remaining = Math.max(0, limit.requests - bucket.requests.length)
  const oldestRequest = bucket.requests[0] || now
  const resetTime = oldestRequest + limit.window * 1000

  return {
    allowed: remaining > 0,
    limit: limit.requests,
    remaining,
    reset: Math.floor(resetTime / 1000),
  }
}

/**
 * Reset rate limit for an API key (admin function)
 */
export function resetRateLimit(apiKeyId: string, action?: string): void {
  if (action) {
    const key = getBucketKey(apiKeyId, action)
    buckets.delete(key)
  } else {
    // Reset all limits for this API key
    const keysToDelete: string[] = []
    for (const key of buckets.keys()) {
      if (key.startsWith(`${apiKeyId}:`)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => buckets.delete(key))
  }
}

/**
 * Periodic cleanup of old buckets (run this every hour or so)
 */
export function cleanupOldBuckets(): void {
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours

  for (const [key, bucket] of buckets.entries()) {
    // If no requests in the last 24 hours, remove the bucket
    if (bucket.requests.length === 0 || now - bucket.requests[bucket.requests.length - 1] > maxAge) {
      buckets.delete(key)
    }
  }
}

/**
 * Map endpoint paths to action names for rate limiting
 */
export function getActionFromPath(method: string, path: string): string {
  // Extract the relevant part of the path
  const match = path.match(/\/api\/v1\/agent\/(\w+)\/?([\w-]+)?/)
  if (!match) return 'unknown'

  const [, resource, action] = match

  // Map HTTP methods and paths to action names
  if (method === 'GET' && action === 'list') return `${resource}.list`
  if (method === 'POST' && action === 'create') return `${resource}.create`
  if (method === 'PATCH' && path.includes('/update')) return `${resource}.update`
  if (method === 'DELETE') return `${resource}.delete`
  if (method === 'GET') return `${resource}.get`
  if (method === 'POST' && resource === 'assets' && path.includes('generate')) return 'ai.generate'

  return `${resource}.${action || method.toLowerCase()}`
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(headers: Headers, result: RateLimitResult): void {
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.reset.toString())

  if (!result.allowed && result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString())
  }
}
