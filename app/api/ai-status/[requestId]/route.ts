import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
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

    const { requestId } = params

    // Get the request
    const { data: aiRequest, error: fetchError } = await supabase
      .from("ai_image_requests")
      .select("*")
      .eq("id", requestId)
      .eq("user_id", user.id) // Ensure user owns this request
      .single()

    if (fetchError || !aiRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // If completed, include public URL
    let publicUrl = null
    if (aiRequest.status === "completed" && aiRequest.storage_key) {
      const keyParts = aiRequest.storage_key.split("/")
      const bucketName = keyParts[0]
      const filename = keyParts.slice(1).join("/")

      const {
        data: { publicUrl: url },
      } = supabase.storage.from(bucketName).getPublicUrl(filename)

      publicUrl = url
    }

    return NextResponse.json({
      requestId: aiRequest.id,
      status: aiRequest.status,
      product: aiRequest.product,
      brand: aiRequest.brand,
      storageKey: aiRequest.storage_key,
      storageId: aiRequest.storage_id,
      publicUrl,
      errorMessage: aiRequest.error_message,
      createdAt: aiRequest.created_at,
      completedAt: aiRequest.completed_at,
    })
  } catch (error) {
    console.error("Error in /api/ai-status:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
