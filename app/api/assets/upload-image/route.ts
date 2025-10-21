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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string
    const format = formData.get("format") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: "Asset name is required" }, { status: 400 })
    }

    // Generate unique filename with organization folder
    const timestamp = Date.now()
    const fileExt = file.name.split(".").pop()
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const filePath = `${organizationId}/${fileName}`

    // Get bucket name from environment
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "biddable-images"

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath)

    // Create asset record in database
    const { data: asset, error: insertError } = await supabase
      .from("assets")
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        name,
        type: "image",
        format: format || fileExt?.toUpperCase() || "IMAGE",
        file_url: publicUrl,
        status: "draft",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Database insert error:", insertError)
      // Try to delete the uploaded file if database insert fails
      await supabase.storage.from(bucketName).remove([filePath])
      return NextResponse.json({ error: `Failed to create asset: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        asset,
        publicUrl,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error in POST /api/assets/upload-image:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
