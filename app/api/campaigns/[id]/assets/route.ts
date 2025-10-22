import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Fetch all assets assigned to a campaign
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

    // Fetch assigned assets with join
    const { data: assignments, error: assignmentsError } = await supabase
      .from('campaign_assets')
      .select(`
        id,
        assigned_at,
        asset_id,
        assets (
          id,
          name,
          type,
          format,
          size,
          file_url,
          status,
          ad_format,
          ad_data,
          created_at
        )
      `)
      .eq('campaign_id', campaignId)
      .order('assigned_at', { ascending: false })

    if (assignmentsError) {
      console.error('Error fetching campaign assets:', assignmentsError)
      return NextResponse.json(
        { error: assignmentsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ assets: assignments || [] })
  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]/assets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Assign an asset to a campaign
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
    const { asset_id } = body

    // Validate inputs
    if (!campaignId || isNaN(Number(campaignId))) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      )
    }

    if (!asset_id) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
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

    // Verify asset exists and user has access to it (via organization)
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

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, organization_id')
      .eq('id', asset_id)
      .eq('organization_id', orgData.organization_id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      )
    }

    // Assign asset to campaign (asset_id is already a UUID string)
    const { data: assignment, error: insertError } = await supabase
      .from('campaign_assets')
      .insert({
        campaign_id: Number(campaignId),
        asset_id: asset_id, // UUID string
        assigned_by: user.id
      })
      .select()
      .single()

    if (insertError) {
      // Check if it's a duplicate error
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Asset is already assigned to this campaign' },
          { status: 409 }
        )
      }
      console.error('Error assigning asset:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, assignment }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/campaigns/[id]/assets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Unassign an asset from a campaign
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
    const assetId = searchParams.get('asset_id')

    // Validate inputs
    if (!campaignId || isNaN(Number(campaignId))) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      )
    }

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
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

    // Unassign the asset (assetId is a UUID string, no need to convert)
    const { error: deleteError } = await supabase
      .from('campaign_assets')
      .delete()
      .eq('campaign_id', Number(campaignId))
      .eq('asset_id', assetId)

    if (deleteError) {
      console.error('Error unassigning asset:', deleteError)
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in DELETE /api/campaigns/[id]/assets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
