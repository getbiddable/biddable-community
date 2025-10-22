import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Fetch a single audience by ID
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

    const audienceId = params.id

    // Validate audience ID
    if (!audienceId || isNaN(Number(audienceId))) {
      return NextResponse.json(
        { error: 'Invalid audience ID' },
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
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get the audience by ID, ensuring it's in user's organization
    const { data: audience, error: audienceError } = await supabase
      .from('audiences')
      .select('*')
      .eq('id', audienceId)
      .eq('organization_id', orgData.organization_id)
      .single()

    if (audienceError) {
      if (audienceError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Audience not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: audienceError.message },
        { status: 500 }
      )
    }

    if (!audience) {
      return NextResponse.json(
        { error: 'Audience not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ audience })
  } catch (error) {
    console.error('Error fetching audience:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Update an audience
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

    const audienceId = params.id
    const body = await request.json()

    // Validate audience ID
    if (!audienceId || isNaN(Number(audienceId))) {
      return NextResponse.json(
        { error: 'Invalid audience ID' },
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
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Verify audience exists and is in user's organization
    const { data: existingAudience, error: checkError } = await supabase
      .from('audiences')
      .select('id, organization_id')
      .eq('id', audienceId)
      .eq('organization_id', orgData.organization_id)
      .single()

    if (checkError || !existingAudience) {
      return NextResponse.json(
        { error: 'Audience not found or access denied' },
        { status: 404 }
      )
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.age_min !== undefined) updateData.age_min = body.age_min
    if (body.age_max !== undefined) updateData.age_max = body.age_max
    if (body.genders !== undefined) updateData.genders = body.genders
    if (body.locations !== undefined) updateData.locations = body.locations
    if (body.interests !== undefined) updateData.interests = body.interests
    if (body.behaviors !== undefined) updateData.behaviors = body.behaviors
    if (body.estimated_size !== undefined) updateData.estimated_size = body.estimated_size
    if (body.status !== undefined) updateData.status = body.status
    if (body.targeting_criteria !== undefined) updateData.targeting_criteria = body.targeting_criteria

    // Update the audience
    const { data: audience, error: updateError } = await supabase
      .from('audiences')
      .update(updateData)
      .eq('id', audienceId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating audience:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, audience })
  } catch (error) {
    console.error('Error in PUT /api/audiences/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Archive an audience (soft delete by setting status to 'archived')
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

    const audienceId = params.id

    // Validate audience ID
    if (!audienceId || isNaN(Number(audienceId))) {
      return NextResponse.json(
        { error: 'Invalid audience ID' },
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
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Verify audience exists and is in user's organization
    const { data: existingAudience, error: checkError } = await supabase
      .from('audiences')
      .select('id, organization_id')
      .eq('id', audienceId)
      .eq('organization_id', orgData.organization_id)
      .single()

    if (checkError || !existingAudience) {
      return NextResponse.json(
        { error: 'Audience not found or access denied' },
        { status: 404 }
      )
    }

    // Soft delete: set status to 'archived'
    const { error: updateError } = await supabase
      .from('audiences')
      .update({ status: 'archived' })
      .eq('id', audienceId)

    if (updateError) {
      console.error('Error archiving audience:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Audience archived' })
  } catch (error) {
    console.error('Error in DELETE /api/audiences/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
