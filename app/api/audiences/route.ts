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

    // Get user's organization
    const { data: orgData, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgData) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      targeting_criteria,
      age_min,
      age_max,
      genders,
      locations,
      interests,
      behaviors,
      estimated_size
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Insert the audience
    const { data: audience, error: insertError } = await supabase
      .from('audiences')
      .insert({
        organization_id: orgData.organization_id,
        user_id: user.id,
        name,
        description,
        targeting_criteria: targeting_criteria || {},
        age_min,
        age_max,
        genders: genders || [],
        locations: locations || [],
        interests: interests || [],
        behaviors: behaviors || [],
        estimated_size: estimated_size || 0,
        status: 'active'
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, audience })
  } catch (error) {
    console.error('Error creating audience:', error)
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
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get all audiences for the organization
    const { data: audiences, error: audiencesError } = await supabase
      .from('audiences')
      .select('*')
      .eq('organization_id', orgData.organization_id)
      .order('created_at', { ascending: false })

    if (audiencesError) {
      return NextResponse.json(
        { error: audiencesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ audiences: audiences || [] })
  } catch (error) {
    console.error('Error fetching audiences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
