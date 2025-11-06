import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, messages, model = "gpt-3.5-turbo", max_tokens = 500, temperature = 0.7 } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 },
      )
    }

    const allowedEndpoints = (process.env.LLM_PROXY_ALLOWED_ENDPOINTS || "")
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean)

    if (allowedEndpoints.length === 0) {
      console.error("[v0] Chat proxy misconfiguration: no allowed endpoints defined")
      return NextResponse.json(
        { error: "Chat proxy is not configured with any allowed endpoints" },
        { status: 500 },
      )
    }

    // Parse and validate the endpoint URL
    let endpointUrl: URL

    try {
      endpointUrl = new URL(endpoint)
    } catch {
      return NextResponse.json(
        { error: "Invalid endpoint URL" },
        { status: 400 },
      )
    }

    // Validate protocol is HTTPS
    if (endpointUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Endpoint must use HTTPS" },
        { status: 400 },
      )
    }

    // Check for path traversal attempts
    const pathname = endpointUrl.pathname
    if (pathname.includes("..") || pathname.includes("%2e%2e") || pathname.includes("%252e")) {
      console.error("[v0] Chat proxy blocked path traversal attempt", {
        endpoint: endpoint,
        pathname: pathname,
      })
      return NextResponse.json(
        { error: "Invalid endpoint path" },
        { status: 400 },
      )
    }

    // Validate against allowlist - check if hostname and path prefix match
    const isAllowed = allowedEndpoints.some((allowedEndpoint) => {
      try {
        const allowedUrl = new URL(allowedEndpoint)

        // Must match hostname exactly
        if (allowedUrl.hostname !== endpointUrl.hostname) {
          return false
        }

        // Path must start with allowed path (prefix match)
        if (!pathname.startsWith(allowedUrl.pathname)) {
          return false
        }

        return true
      } catch {
        // Invalid URL in allowlist, skip it
        return false
      }
    })

    if (!isAllowed) {
      console.error("[v0] Chat proxy blocked request to unauthorized endpoint", {
        endpoint: endpointUrl.hostname + pathname,
        allowedHosts: allowedEndpoints.map(e => {
          try { return new URL(e).hostname } catch { return "invalid" }
        }),
      })
      return NextResponse.json(
        { error: "Endpoint is not authorized for chat proxy usage" },
        { status: 403 },
      )
    }

    console.log("[v0] Proxying request to LLM endpoint:", endpointUrl.toString())

    // Make the request to the LLM endpoint from the server side
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
      console.error("[v0] LLM API error:", response.status, errorText)
      return NextResponse.json(
        { error: `LLM API returned ${response.status}: ${errorText}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("[v0] LLM API response received successfully")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in chat proxy:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
