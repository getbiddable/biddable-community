import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    // Get user's organizations with organization details
    const { data: orgMembers, error: orgError } = await supabase
      .from("organization_members")
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name
        )
      `)
      .eq("user_id", user.id)

    if (orgError) {
      console.error("Error fetching organizations:", orgError)
      return NextResponse.json({ error: orgError.message }, { status: 500 })
    }

    // Format the response
    const organizations = orgMembers?.map((member: any) => ({
      id: member.organizations.id,
      name: member.organizations.name,
      role: member.role,
    })) || []

    const profile = {
      email: user.email,
      userId: user.id,
      organizations,
    }

    return NextResponse.json(profile, { status: 200 })
  } catch (error) {
    console.error("Error in GET /api/profile:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
