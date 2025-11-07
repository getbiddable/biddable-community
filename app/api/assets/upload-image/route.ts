import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Validate image file by checking magic numbers (file signatures)
 * This prevents attackers from uploading malicious files disguised as images
 */
function validateImageMagicNumbers(buffer: Buffer, expectedExt: string): boolean {
  if (buffer.length < 12) return false

  // Magic number signatures for different image formats
  const signatures = {
    jpg: [
      [0xff, 0xd8, 0xff, 0xe0], // JPEG JFIF
      [0xff, 0xd8, 0xff, 0xe1], // JPEG Exif
      [0xff, 0xd8, 0xff, 0xe2], // JPEG
      [0xff, 0xd8, 0xff, 0xe8], // JPEG
    ],
    jpeg: [
      [0xff, 0xd8, 0xff, 0xe0],
      [0xff, 0xd8, 0xff, 0xe1],
      [0xff, 0xd8, 0xff, 0xe2],
      [0xff, 0xd8, 0xff, 0xe8],
    ],
    png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]], // PNG
    gif: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
    webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)
  }

  const ext = expectedExt.toLowerCase() as keyof typeof signatures
  const expectedSignatures = signatures[ext]

  if (!expectedSignatures) return false

  // Check if buffer starts with any of the expected signatures
  return expectedSignatures.some((signature) => {
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false
    }
    return true
  })
}

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

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      )
    }

    // Validate file extension
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"]
    const fileExt = file.name.split(".").pop()?.toLowerCase()

    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedExtensions.join(", ")}` },
        { status: 400 }
      )
    }

    // Validate MIME type
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid MIME type. Allowed: ${allowedMimeTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Convert file to buffer for magic number validation
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Validate magic numbers (file signatures)
    const isValidImage = validateImageMagicNumbers(fileBuffer, fileExt)
    if (!isValidImage) {
      return NextResponse.json(
        { error: "File content does not match declared image type" },
        { status: 400 }
      )
    }

    // Generate unique filename with organization folder
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${timestamp}-${sanitizedName}`
    const filePath = `${organizationId}/${fileName}`

    // Get bucket name from environment
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "biddable-images"

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
