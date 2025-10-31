import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revokeApiKey } from '@/lib/agent-api-keys'

/**
 * POST /api/settings/api-keys/[id]/revoke
 * Revoke (deactivate) an API key
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgData, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgData) {
      return NextResponse.json({ error: 'No organization found for user' }, { status: 400 })
    }

    // Verify the API key belongs to the user's organization
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', orgData.organization_id)
      .single()

    if (keyError || !apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Revoke the API key
    await revokeApiKey(params.id)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error revoking API key:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}
