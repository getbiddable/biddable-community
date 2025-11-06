import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 20

type RateLimitEntry = {
  count: number
  reset: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const chatRequestSchema = z.object({
  endpoint: z.string().url("Endpoint must be a valid HTTPS URL"),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant", "tool"]),
      content: z.string().min(1, "Message content cannot be empty").max(4000),
      name: z.string().max(64).optional(),
      tool_calls: z.unknown().optional(),
      tool_call_id: z.string().max(128).optional(),
    })
  ).min(1, "At least one message is required"),
  model: z.string().min(1).default("gpt-3.5-turbo"),
  max_tokens: z.number().int().positive().max(4096).default(500),
  temperature: z.number().min(0).max(2).default(0.7),
})

function checkRateLimit(userId: string) {
  const now = Date.now()
  const existing = rateLimitStore.get(userId)

  if (!existing || now >= existing.reset) {
    const reset = now + RATE_LIMIT_WINDOW_MS
    rateLimitStore.set(userId, { count: 1, reset })
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      reset,
    }
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      reset: existing.reset,
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
    reset: existing.reset,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimit = checkRateLimit(user.id)
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before sending more requests.",
          retry_after: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        { status: 429 },
      )
      response.headers.set("X-RateLimit-Limit", RATE_LIMIT_MAX_REQUESTS.toString())
      response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString())
      response.headers.set("X-RateLimit-Reset", Math.floor(rateLimit.reset / 1000).toString())
      return response
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 })
    }

    const parseResult = chatRequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.issues.map(issue => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      )
    }

    const { endpoint, messages, model, max_tokens, temperature } = parseResult.data

    const allowedEndpoints = (process.env.LLM_PROXY_ALLOWED_ENDPOINTS || "")
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean)

    if (allowedEndpoints.length === 0) {
      console.error("[chat-proxy] Misconfiguration: no allowed endpoints defined")
      return NextResponse.json(
        { error: "Chat proxy is not configured with any allowed endpoints" },
        { status: 500 },
      )
    }

    let endpointUrl: URL
    try {
      endpointUrl = new URL(endpoint)
    } catch {
      return NextResponse.json(
        { error: "Invalid endpoint URL" },
        { status: 400 },
      )
    }

    if (endpointUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Endpoint must use HTTPS" },
        { status: 400 },
      )
    }

    const pathname = endpointUrl.pathname
    if (pathname.includes("..") || pathname.includes("%2e%2e") || pathname.includes("%252e")) {
      console.error("[chat-proxy] Blocked path traversal attempt", { endpoint, pathname })
      return NextResponse.json(
        { error: "Invalid endpoint path" },
        { status: 400 },
      )
    }

    const isAllowed = allowedEndpoints.some((allowedEndpoint) => {
      try {
        const allowedUrl = new URL(allowedEndpoint)

        if (allowedUrl.hostname !== endpointUrl.hostname) {
          return false
        }

        return pathname.startsWith(allowedUrl.pathname)
      } catch {
        return false
      }
    })

    if (!isAllowed) {
      console.error("[chat-proxy] Blocked unauthorized endpoint", {
        endpoint: endpointUrl.hostname + pathname,
      })
      return NextResponse.json(
        { error: "Endpoint is not authorized for chat proxy usage" },
        { status: 403 },
      )
    }

    console.log("[chat-proxy] Proxying request to:", endpointUrl.toString(), { userId: user.id })

    const response = await fetch(endpointUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[chat-proxy] Upstream error:", response.status, errorText)
      return NextResponse.json(
        { error: `LLM API returned ${response.status}: ${errorText}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    const successResponse = NextResponse.json(data, { status: 200 })
    successResponse.headers.set("X-RateLimit-Limit", RATE_LIMIT_MAX_REQUESTS.toString())
    successResponse.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString())
    successResponse.headers.set("X-RateLimit-Reset", Math.floor(rateLimit.reset / 1000).toString())
    return successResponse
  } catch (error) {
    console.error("[chat-proxy] Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
