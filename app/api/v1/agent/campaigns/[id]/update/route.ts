import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAgentRequest,
  createErrorResponse,
  generateRequestId,
  addAgentApiHeaders,
} from '@/lib/agent-api-middleware'
import { validateCampaignBudget, formatBudgetError } from '@/lib/agent-budget-validator'
import { z } from 'zod'

/**
 * Validation schema for campaign updates (all fields optional)
 */
const CampaignUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  platforms: z.array(z.enum(['google', 'youtube', 'reddit', 'meta'])).min(1).optional(),
  budget: z.number().int().min(1).max(10000).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  goal: z.string().max(500).optional(),
  status: z.boolean().optional(),
})

/**
 * PATCH /api/v1/agent/campaigns/[id]/update
 * Update an existing campaign
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { organizationId, requestId, rateLimit } = authResult

  try {
    const campaignId = parseInt(params.id)

    if (isNaN(campaignId)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid campaign ID',
        400,
        { id: params.id },
        requestId
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = CampaignUpdateSchema.safeParse(body)
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

    // Validate date range if both provided
    if (data.start_date && data.end_date) {
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
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check campaign exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, created_by, budget, start_date, end_date')
      .eq('id', campaignId)
      .single()

    if (fetchError || !existing) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Campaign not found',
        404,
        { campaign_id: campaignId },
        requestId
      )
    }

    // Verify user belongs to same org
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', existing.created_by)
      .single()

    if (orgError || userOrg?.organization_id !== organizationId) {
      return createErrorResponse(
        'FORBIDDEN',
        'You do not have access to this campaign',
        403,
        { campaign_id: campaignId },
        requestId
      )
    }

    // Build update object
    const updateData: any = {}
    if (data.name !== undefined) updateData.campaign_name = data.name
    if (data.platforms !== undefined) updateData.platforms = data.platforms
    if (data.budget !== undefined) updateData.budget = data.budget
    if (data.start_date !== undefined) updateData.start_date = data.start_date
    if (data.end_date !== undefined) updateData.end_date = data.end_date
    if (data.goal !== undefined) updateData.goal = data.goal
    if (data.status !== undefined) updateData.status = data.status

    // Validate budget if budget, start_date, or end_date is being updated
    if (data.budget !== undefined || data.start_date !== undefined || data.end_date !== undefined) {
      const newBudget = data.budget ?? existing.budget
      const newStartDate = data.start_date ?? existing.start_date
      const newEndDate = data.end_date ?? existing.end_date

      const budgetValidation = await validateCampaignBudget(
        organizationId,
        newBudget,
        newStartDate,
        newEndDate,
        campaignId // Exclude current campaign from calculation
      )

      if (!budgetValidation.valid) {
        const errorResponse = formatBudgetError(budgetValidation)
        const response = NextResponse.json(errorResponse, { status: 400 })
        addAgentApiHeaders(response.headers, requestId, rateLimit)
        return response
      }
    }

    // Update campaign
    const { data: campaign, error: updateError } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating campaign:', updateError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to update campaign',
        500,
        { error: updateError.message },
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
      { status: 200 }
    )

    addAgentApiHeaders(response.headers, requestId, rateLimit)
    return response
  } catch (error) {
    console.error('Error in campaign update endpoint:', error)

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
