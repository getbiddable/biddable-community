import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Get the campaign by ID, ensuring user owns it
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('created_by', user.id)
      .single()

    if (campaignError) {
      if (campaignError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: campaignError.message },
        { status: 500 }
      )
    }

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Parse request body
    const body = await request.json()
    const { campaign_name, budget, start_date, end_date, goal, platforms, status } = body

    // Validate required fields
    if (!campaign_name || !budget || !start_date || !end_date || !platforms) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user owns the campaign
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('created_by', user.id)
      .single()

    if (fetchError || !existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      )
    }

    // Update the campaign
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({
        campaign_name,
        budget,
        start_date,
        end_date,
        goal: goal || null,
        platforms,
        status: status !== undefined ? status : true
      })
      .eq('id', campaignId)
      .eq('created_by', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating campaign:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaign: updatedCampaign })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
