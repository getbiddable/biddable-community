import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's organization
    const { data: orgData, error: orgError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (orgError || !orgData) {
      return NextResponse.json({ error: "No organization found for user" }, { status: 400 })
    }

    const organizationId = orgData.organization_id

    // Parse request body
    const { Product, "Your Brand": brand } = await request.json()

    if (!Product || !brand) {
      return NextResponse.json({ error: "Product and Brand are required" }, { status: 400 })
    }

    // Rate limiting check
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from("ai_image_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo)

    const rateLimit = parseInt(process.env.AI_GENERATION_RATE_LIMIT_PER_HOUR || "100", 10)
    if (count !== null && count >= rateLimit) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Maximum ${rateLimit} requests per hour.` },
        { status: 429 }
      )
    }

    // Create database record
    const { data: aiRequest, error: insertError } = await supabase
      .from("ai_image_requests")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        product: Product,
        brand: brand,
        status: "pending",
      })
      .select()
      .single()

    if (insertError || !aiRequest) {
      console.error("Failed to create AI request record:", insertError)
      return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
    }

    // Prepare payload for n8n
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai-callback`
    const n8nPayload = {
      requestId: aiRequest.id,
      Product: Product,
      "Your Brand": brand,
      organizationId: organizationId,
      callbackUrl: callbackUrl,
      callbackSecret: process.env.AI_CALLBACK_SECRET,
      submittedAt: new Date().toISOString(),
      formMode: process.env.NODE_ENV === "production" ? "production" : "test",
    }

    console.log("Sending to n8n:", { requestId: aiRequest.id, Product, brand, callbackUrl })

    // Send to n8n (fire and forget - don't await)
    fetch(process.env.N8N_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
      },
      body: JSON.stringify(n8nPayload),
    })
      .then(async (response) => {
        if (!response.ok) {
          console.error("n8n webhook error:", response.status, await response.text())
          // Update status to failed
          await supabase
            .from("ai_image_requests")
            .update({
              status: "failed",
              error_message: `n8n webhook returned ${response.status}`,
              updated_at: new Date().toISOString()
            })
            .eq("id", aiRequest.id)
        } else {
          console.log("n8n webhook accepted request:", aiRequest.id)
          // Update status to processing
          await supabase
            .from("ai_image_requests")
            .update({
              status: "processing",
              updated_at: new Date().toISOString()
            })
            .eq("id", aiRequest.id)
        }
      })
      .catch(async (error) => {
        console.error("n8n webhook error:", error)
        await supabase
          .from("ai_image_requests")
          .update({
            status: "failed",
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq("id", aiRequest.id)
      })

    // Return immediately with request ID (202 Accepted)
    return NextResponse.json(
      {
        requestId: aiRequest.id,
        status: "pending",
        message: "AI image generation started. This may take 30-60 seconds.",
      },
      { status: 202 }
    )
  } catch (error) {
    console.error("Error in /api/ai-generate:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
