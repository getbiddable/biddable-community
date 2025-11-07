import { type NextRequest, NextResponse } from "next/server"
import { createClient as createBrowserClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const providedSecret = request.headers.get("X-Callback-Secret")
    const expectedSecret = process.env.AI_CALLBACK_SECRET

    if (!providedSecret || providedSecret !== expectedSecret) {
      logger.error("Invalid callback secret received")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    logger.info("AI callback received", { requestId: body.requestId, status: body.status })

    const { requestId, status, Key, Id, error, "folder/filename": folderFilename } = body

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 })
    }

    // Use service role client to bypass RLS (callback has no auth cookies)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (status === "completed" && (Key || folderFilename) && Id) {
      // Use Key if available, otherwise use folder/filename
      const storageKey = Key || folderFilename

      updateData.status = "completed"
      updateData.storage_key = storageKey
      updateData.storage_id = Id
      updateData.completed_at = new Date().toISOString()

      // Get the request to get user_id and organization_id
      const { data: aiRequest } = await supabase
        .from("ai_image_requests")
        .select("user_id, organization_id, product, brand")
        .eq("id", requestId)
        .single()

      if (aiRequest) {
        // Extract bucket and filename from Key
        const keyParts = storageKey.split("/")
        const bucketName = keyParts[0]
        const filename = keyParts.slice(1).join("/")

        logger.info("Processing completed AI request", {
          requestId,
          bucketName,
          filename,
          product: aiRequest.product,
          brand: aiRequest.brand,
        })

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucketName).getPublicUrl(filename)

        // Create asset record
        const { error: assetError } = await supabase.from("assets").insert({
          organization_id: aiRequest.organization_id,
          user_id: aiRequest.user_id,
          name: `AI Generated: ${aiRequest.product} - ${aiRequest.brand}`,
          type: "image",
          format: "PNG",
          file_url: publicUrl,
          status: "approved",
        })

        if (assetError) {
          logger.error("Failed to create asset record", assetError, { requestId })
        } else {
          logger.info("Asset record created successfully", { requestId })
        }
      }
    } else if (status === "failed" || error) {
      updateData.status = "failed"
      updateData.error_message = error || "Unknown error"
      updateData.completed_at = new Date().toISOString()
      logger.error("AI request failed", error, { requestId })
    }

    // Update the request
    const { error: updateError } = await supabase
      .from("ai_image_requests")
      .update(updateData)
      .eq("id", requestId)

    if (updateError) {
      logger.error("Failed to update AI request", updateError, { requestId })
      return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
    }

    logger.info("AI request updated successfully", { requestId, status: updateData.status })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.error("Error in /api/ai-callback", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
