/**
 * Agent API - Budget Status Endpoint
 *
 * GET /api/v1/agent/budget/status
 *
 * Returns current budget status for the organization including:
 * - Monthly budget limit
 * - Total budget allocated for current/upcoming months
 * - Remaining budget available
 * - List of campaigns contributing to the budget
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgentRequest, addAgentApiHeaders } from '@/lib/agent-api-middleware'
import { getBudgetStatus, MAX_MONTHLY_BUDGET } from '@/lib/agent-budget-validator'
import { logAuditEntry, createAuditEntry } from '@/lib/agent-audit-logger'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate request
  const authResult = await authenticateAgentRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { apiKeyId, organizationId, requestId } = authResult

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
      ? parseInt(searchParams.get('year')!)
      : undefined
    const month = searchParams.get('month')
      ? parseInt(searchParams.get('month')!)
      : undefined

    // Validate month if provided
    if (month !== undefined && (month < 1 || month > 12)) {
      const errorBody = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid month. Must be between 1 and 12.',
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      }
      const response = NextResponse.json(errorBody, { status: 400 })

      // Log audit entry for validation error
      logAuditEntry(
        createAuditEntry(
          apiKeyId,
          organizationId,
          request,
          { status: 400, body: errorBody },
          startTime,
          undefined,
          'Invalid month parameter'
        )
      )

      return response
    }

    // Get budget status
    const budgetStatus = await getBudgetStatus(organizationId, year, month)

    // Format response
    const responseBody = {
      success: true,
      data: {
        monthly_limit: budgetStatus.monthly_limit,
        months: budgetStatus.months.map(m => ({
          year: m.year,
          month: m.month,
          month_name: new Date(m.year, m.month - 1).toLocaleString('en-US', { month: 'long' }),
          monthly_total: m.monthly_total,
          remaining: m.remaining,
          utilization_percentage: Math.round((m.monthly_total / MAX_MONTHLY_BUDGET) * 100),
          campaigns: m.campaigns,
        })),
      },
    }

    // Log audit entry (async, non-blocking)
    logAuditEntry(
      createAuditEntry(
        apiKeyId,
        organizationId,
        request,
        { status: 200, body: responseBody },
        startTime,
        undefined
      )
    )

    const response = NextResponse.json(responseBody, { status: 200 })

    // Add standard headers
    addAgentApiHeaders(response.headers, requestId)

    return response
  } catch (error: unknown) {
    console.error('Error fetching budget status:', error)

    // Log audit entry for error (async, non-blocking)
    logAuditEntry(
      createAuditEntry(
        apiKeyId,
        organizationId,
        request,
        { status: 500 },
        startTime,
        undefined,
        error instanceof Error ? error.message : String(error)
      )
    )

    const response = NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch budget status',
          timestamp: new Date().toISOString(),
          request_id: requestId,
        },
      },
      { status: 500 }
    )

    addAgentApiHeaders(response.headers, requestId)
    return response
  }
}
