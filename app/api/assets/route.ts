import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.error("Auth error in POST /api/assets", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    logger.debug("Authenticated user", { email: user.email, userId: user.id })

    // Get user's organization
    const { data: orgData, error: orgError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (orgError || !orgData) {
      logger.error("Organization error in POST /api/assets", orgError, { userId: user.id })
      return NextResponse.json({
        error: "No organization found for user",
        details: orgError?.message,
        userId: user.id
      }, { status: 400 })
    }

    const body = await request.json()
    const { name, type, ad_format, ad_data, format, size, file_url } = body

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
    }

    // Insert asset into database
    const { data: asset, error: insertError } = await supabase
      .from("assets")
      .insert({
        organization_id: orgData.organization_id,
        user_id: user.id,
        name,
        type,
        ad_format: ad_format || null,
        ad_data: ad_data || null,
        format: format || null,
        size: size || null,
        file_url: file_url || null,
        status: "draft",
      })
      .select()
      .single()

    if (insertError) {
      logger.error("Error inserting asset", insertError, { userId: user.id, organizationId: orgData.organization_id })
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, asset }, { status: 201 })
  } catch (error) {
    logger.error("Error in POST /api/assets", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    // Fetch all assets for the organization
    const { data: assets, error: fetchError } = await supabase
      .from("assets")
      .select("*")
      .eq("organization_id", orgData.organization_id)
      .order("created_at", { ascending: false })

    if (fetchError) {
      logger.error("Error fetching assets", fetchError, { organizationId: orgData.organization_id })
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({ assets }, { status: 200 })
  } catch (error) {
    logger.error("Error in GET /api/assets", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
