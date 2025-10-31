import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'
import { z } from 'zod'

/**
 * Validation schema for campaign creation
 */
const CampaignCreateSchema = z.object({
  name: z.string().min(1).max(100),
  platforms: z.array(z.enum(['google', 'youtube', 'reddit', 'meta'])).min(1),
  budget: z.number().int().min(1).max(10000),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  goal: z.string().max(500).optional(),
})

/**
 * POST /api/v1/agent/campaigns/create
 * Create a new campaign for the authenticated organization
 *
 * Request body:
 * {
 *   name: string (1-100 chars)
 *   platforms: ('google' | 'youtube' | 'reddit' | 'meta')[] (min 1)
 *   budget: number (1-10000)
 *   start_date: string (YYYY-MM-DD)
 *   end_date: string (YYYY-MM-DD)
 *   goal?: string (max 500 chars)
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  // Authenticate request
  const auth = await authenticateAgentRequest(request)
  if (auth instanceof NextResponse) {
    return auth // Error response
  }

  try {
    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = CampaignCreateSchema.safeParse(body)
    if (!validation.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid campaign data',
        400,
        { errors: validation.error.flatten().fieldErrors },
        requestId
      )
    }

    const data = validation.data

    // Validate date range
    const startDate = new Date(data.start_date)
    const endDate = new Date(data.end_date)

    if (endDate <= startDate) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'End date must be after start date',
        400,
        { start_date: data.start_date, end_date: data.end_date },
        requestId
      )
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get first user from organization (use as created_by)
    const { data: orgMembers, error: orgError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', auth.organizationId)
      .limit(1)
      .single()

    if (orgError || !orgMembers) {
      console.error('Error getting org user:', orgError)
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get organization user',
        500,
        { error: orgError?.message },
        requestId
      )
    }

    // TODO: Add budget validation here (Week 2)
    // Check if total monthly budget for org would exceed $10,000

    // Create campaign
    const { data: campaign, error: createError } = await supabase
      .from('campaigns')
      .insert({
        campaign_name: data.name,
        platforms: data.platforms,
        budget: data.budget,
        start_date: data.start_date,
        end_date: data.end_date,
        goal: data.goal,
        created_by: orgMembers.user_id,
        status: true, // Active by default
        payment_status: 'pending',
        amount_spent: 0,
        amount_collected: 0,
        media_fee_charged: 0,
        subscription_plan: 'free',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating campaign:', createError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to create campaign',
        500,
        { error: createError.message },
        requestId
      )
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          campaign,
        },
      },
      { status: 201 }
    )

    return addAgentApiHeaders(response, requestId)
  } catch (error) {
    console.error('Error in campaign create endpoint:', error)

    if (error instanceof SyntaxError) {
      return createErrorResponse(
        'INVALID_JSON',
        'Invalid JSON in request body',
        400,
        undefined,
        requestId
      )
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    )
  }
}
