import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Forward the request to n8n webhook
    const n8nResponse = await fetch(
      "https://biddable.app.n8n.cloud/webhook-test/7cca0f58-831a-46af-ab24-fbc86b01bbfc",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    if (!n8nResponse.ok) {
      console.error("n8n webhook error:", n8nResponse.status, n8nResponse.statusText)
      return NextResponse.json(
        { error: `n8n webhook returned status ${n8nResponse.status}` },
        { status: n8nResponse.status }
      )
    }

    // Parse and return the response from n8n
    const responseData = await n8nResponse.json()
    console.log("n8n response data:", responseData)

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("Error in /api/ai-generate:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
