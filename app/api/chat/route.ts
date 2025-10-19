import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, messages, model = "gpt-3.5-turbo", max_tokens = 500, temperature = 0.7 } = body

    console.log("[v0] Proxying request to LLM endpoint:", endpoint)

    // Make the request to the LLM endpoint from the server side
    const response = await fetch(endpoint, {
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
