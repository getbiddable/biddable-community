/**
 * Agent API Rate Limiting System
 *
 * Persists request counters in Postgres so limits apply consistently
 * across multiple application nodes.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Rate limit configuration (requests per window in seconds)
export const RATE_LIMITS = {
  global: { requests: 1000, window: 3600 }, // 1000 requests per hour
  'campaigns.create': { requests: 10, window: 3600 },
  'campaigns.update': { requests: 50, window: 3600 },
  'campaigns.delete': { requests: 10, window: 3600 },
  'campaigns.list': { requests: 200, window: 3600 },
  'assets.list': { requests: 200, window: 3600 },
  'audiences.list': { requests: 200, window: 3600 },
  'audiences.create': { requests: 50, window: 3600 },
  'assets.create': { requests: 50, window: 3600 },
  'ai.generate': { requests: 10, window: 3600 },
} as const

type RateLimitKey = keyof typeof RATE_LIMITS

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when limit resets
  retryAfter?: number
}

interface RateLimitRpcResult {
  allowed: boolean
  remaining: number
  reset: string
}

let serviceRoleClient: SupabaseClient | null = null

function getServiceRoleClient(): SupabaseClient {
  if (serviceRoleClient) {
    return serviceRoleClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service role credentials are required for rate limiting')
  }

  serviceRoleClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return serviceRoleClient
}

function getRateLimitConfig(action: string): { requests: number; window: number } {
  if (action in RATE_LIMITS) {
    return RATE_LIMITS[action as RateLimitKey]
  }
  return RATE_LIMITS.global
}

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

function getBucketKey(apiKeyId: string, action: string): string {
  return `${apiKeyId}:${action}`
}

function normalizeRpcResult(data: any): RateLimitRpcResult {
  if (Array.isArray(data)) {
    return data[0] as RateLimitRpcResult
  }
  return data as RateLimitRpcResult
}

function toUnixSeconds(timestamp: string): number {
  return Math.floor(new Date(timestamp).getTime() / 1000)
}

export async function checkRateLimit(
  apiKeyId: string,
  action: string,
  metadata?: any
): Promise<RateLimitResult> {
  const customLimit = getCustomLimits(metadata, action)
  const actionLimit = customLimit || getRateLimitConfig(action)

  const client = getServiceRoleClient()

  const checks: Array<{ key: string; limit: { requests: number; window: number } }> = [
    { key: getBucketKey(apiKeyId, 'global'), limit: RATE_LIMITS.global },
    { key: getBucketKey(apiKeyId, action), limit: actionLimit },
  ]

  let actionResult: RateLimitRpcResult | null = null

  for (const check of checks) {
    const { data, error } = await client.rpc('increment_agent_rate_limit', {
      p_key: check.key,
      p_limit: check.limit.requests,
      p_window_seconds: check.limit.window,
    })

    if (error) {
      console.error('Rate limiter RPC failed:', error)
      // Fail closed – disallow the request if the limiter cannot be updated
      return {
        allowed: false,
        limit: check.limit.requests,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000),
        retryAfter: check.limit.window,
      }
    }

    const result = normalizeRpcResult(data)

    if (check.key.endsWith(action)) {
      actionResult = result
    }

    if (!result.allowed) {
      const resetSeconds = toUnixSeconds(result.reset)
      const retryAfter = Math.max(0, resetSeconds - Math.floor(Date.now() / 1000))

      return {
        allowed: false,
        limit: check.limit.requests,
        remaining: Math.max(0, result.remaining ?? 0),
        reset: resetSeconds,
        retryAfter,
      }
    }
  }

  const finalResult = actionResult ?? {
    allowed: true,
    remaining: actionLimit.requests,
    reset: new Date(Date.now() + actionLimit.window * 1000).toISOString(),
  }

  return {
    allowed: true,
    limit: actionLimit.requests,
    remaining: Math.max(0, finalResult.remaining ?? 0),
    reset: toUnixSeconds(finalResult.reset),
  }
}

export async function getRateLimitStatus(
  apiKeyId: string,
  action: string,
  metadata?: any
): Promise<RateLimitResult> {
  const customLimit = getCustomLimits(metadata, action)
  const limit = customLimit || getRateLimitConfig(action)
  const key = getBucketKey(apiKeyId, action)

  const client = getServiceRoleClient()
  const { data, error } = await client.rpc('get_agent_rate_limit_status', {
    p_key: key,
    p_limit: limit.requests,
    p_window_seconds: limit.window,
  })

  if (error) {
    console.error('Rate limiter status RPC failed:', error)
    return {
      allowed: true,
      limit: limit.requests,
      remaining: limit.requests,
      reset: Math.floor((Date.now() + limit.window * 1000) / 1000),
    }
  }

  const result = normalizeRpcResult(data)
  return {
    allowed: result.allowed,
    limit: limit.requests,
    remaining: Math.max(0, result.remaining ?? 0),
    reset: toUnixSeconds(result.reset),
  }
}

export async function resetRateLimit(apiKeyId: string, action?: string): Promise<void> {
  const client = getServiceRoleClient()

  if (action) {
    const { error } = await client.rpc('reset_agent_rate_limit', {
      p_key: getBucketKey(apiKeyId, action),
    })
    if (error) {
      console.error('Failed to reset rate limit bucket', { apiKeyId, action, error })
    }
    return
  }

  const { error } = await client
    .from('agent_rate_limit_counters')
    .delete()
    .like('key', `${apiKeyId}:%`)

  if (error) {
    console.error('Failed to reset rate limits for API key', { apiKeyId, error })
  }
}

export async function cleanupOldBuckets(): Promise<void> {
  const client = getServiceRoleClient()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { error } = await client
    .from('agent_rate_limit_counters')
    .delete()
    .lt('updated_at', cutoff)

  if (error) {
    console.error('Failed to clean up old rate limit buckets', error)
  }
}

export function getActionFromPath(method: string, path: string): string {
  const match = path.match(/\/api\/v1\/agent\/(\w+)\/?([\w-]+)?/)
  if (!match) return 'unknown'

  const [, resource, action] = match

  if (method === 'GET' && action === 'list') return `${resource}.list`
  if (method === 'POST' && action === 'create') return `${resource}.create`
  if (method === 'PATCH' && path.includes('/update')) return `${resource}.update`
  if (method === 'DELETE') return `${resource}.delete`

  if (method === 'POST' && path.includes('/assets')) return `${resource}.create`
  if (method === 'POST' && path.includes('/audiences')) return `${resource}.create`
  if (method === 'GET') return `${resource}.get`

  return `${resource}.${method.toLowerCase()}`
}

export function addRateLimitHeaders(headers: Headers, rateLimitInfo: RateLimitResult): void {
  headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString())
  headers.set('X-RateLimit-Remaining', Math.max(0, rateLimitInfo.remaining).toString())
  headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString())

  if (rateLimitInfo.retryAfter !== undefined) {
    headers.set('Retry-After', rateLimitInfo.retryAfter.toString())
  }
}
