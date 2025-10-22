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
