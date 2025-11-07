import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    const body = await request.json()
    const { name, platforms, budget, start_date, end_date, goal } = body

    if (!name || !platforms || !budget || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Name, platforms, budget, start_date, and end_date are required' },
        { status: 400 }
      )
    }

    // Get user's organization
    const { data: orgData, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgData) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 403 }
      )
    }

    // Insert the campaign with organization_id
    const { data: campaign, error: insertError } = await supabase
      .from('campaigns')
      .insert({
        campaign_name: name,
        created_by: user.id,
        organization_id: orgData.organization_id,
        platforms: Array.isArray(platforms) ? platforms : [platforms],
        status: true, // active by default
        budget: parseInt(budget),
        start_date,
        end_date,
        goal: goal || null,
        payment_status: 'pending',
        amount_collected: 0,
        amount_spent: 0,
        media_fee_charged: 0,
        subscription_plan: 'free'
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
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

    // Get user's organization
    const { data: orgData, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgData) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 403 }
      )
    }

    // Get all campaigns for the user's organization
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('organization_id', orgData.organization_id)
      .order('created_at', { ascending: false })

    if (campaignsError) {
      return NextResponse.json(
        { error: campaignsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
