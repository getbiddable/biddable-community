import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Fetch all audiences assigned to a campaign
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const campaignId = params.id

    // Validate campaign ID
    if (!campaignId || isNaN(Number(campaignId))) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      )
    }

    // Verify user owns the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, created_by')
      .eq('id', campaignId)
      .eq('created_by', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch assigned audiences with join
    const { data: assignments, error: assignmentsError } = await supabase
      .from('campaign_audiences')
      .select(`
        id,
        assigned_at,
        audience_id,
        audiences (
          id,
          name,
          description,
          age_min,
          age_max,
          genders,
          locations,
          interests,
          behaviors,
          estimated_size,
          status,
          created_at
        )
      `)
      .eq('campaign_id', campaignId)
      .order('assigned_at', { ascending: false })

    if (assignmentsError) {
      console.error('Error fetching campaign audiences:', assignmentsError)
      return NextResponse.json(
        { error: assignmentsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ audiences: assignments || [] })
  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]/audiences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Assign an audience to a campaign
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const campaignId = params.id
    const body = await request.json()
    const { audience_id } = body

    // Validate inputs
    if (!campaignId || isNaN(Number(campaignId))) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      )
    }

    if (!audience_id) {
      return NextResponse.json(
        { error: 'Audience ID is required' },
        { status: 400 }
      )
    }

    // Verify user owns the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, created_by')
      .eq('id', campaignId)
      .eq('created_by', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      )
    }

    // Verify audience exists and user has access to it (via organization)
    const { data: orgData, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgData) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 400 }
      )
    }

    const { data: audience, error: audienceError } = await supabase
      .from('audiences')
      .select('id, organization_id')
      .eq('id', audience_id)
      .eq('organization_id', orgData.organization_id)
      .single()

    if (audienceError || !audience) {
      return NextResponse.json(
        { error: 'Audience not found or access denied' },
        { status: 404 }
      )
    }

    // Assign audience to campaign (audience_id is now BIGINT)
    const { data: assignment, error: insertError } = await supabase
      .from('campaign_audiences')
      .insert({
        campaign_id: Number(campaignId),
        audience_id: Number(audience_id),
        assigned_by: user.id
      })
      .select()
      .single()

    if (insertError) {
      // Check if it's a duplicate error
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Audience is already assigned to this campaign' },
          { status: 409 }
        )
      }
      console.error('Error assigning audience:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, assignment }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/campaigns/[id]/audiences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Unassign an audience from a campaign
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const campaignId = params.id
    const { searchParams } = new URL(request.url)
    const audienceId = searchParams.get('audience_id')

    // Validate inputs
    if (!campaignId || isNaN(Number(campaignId))) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      )
    }

    if (!audienceId) {
      return NextResponse.json(
        { error: 'Audience ID is required' },
        { status: 400 }
      )
    }

    // Verify user owns the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, created_by')
      .eq('id', campaignId)
      .eq('created_by', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      )
    }

    // Unassign the audience (audienceId is now BIGINT)
    const { error: deleteError } = await supabase
      .from('campaign_audiences')
      .delete()
      .eq('campaign_id', Number(campaignId))
      .eq('audience_id', Number(audienceId))

    if (deleteError) {
      console.error('Error unassigning audience:', deleteError)
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in DELETE /api/campaigns/[id]/audiences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
