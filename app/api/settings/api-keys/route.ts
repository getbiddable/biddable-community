import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createApiKey, listApiKeys } from '@/lib/agent-api-keys'

/**
 * GET /api/settings/api-keys
 * List all API keys for the user's organization
 */
export async function GET(request: NextRequest) {
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

    // List API keys for the organization
    const apiKeys = await listApiKeys(orgData.organization_id)

    return NextResponse.json({ apiKeys }, { status: 200 })
  } catch (error) {
    console.error('Error listing API keys:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/api-keys
 * Create a new API key for the user's organization
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { name, description, permissions, expiresAt, metadata } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create the API key
    const result = await createApiKey({
      organizationId: orgData.organization_id,
      userId: user.id,
      name,
      description,
      permissions,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      metadata,
    })

    return NextResponse.json(
      {
        success: true,
        apiKey: result.apiKey, // IMPORTANT: Only shown once!
        keyPrefix: result.keyPrefix,
        id: result.id,
        name: result.name,
        createdAt: result.createdAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}
