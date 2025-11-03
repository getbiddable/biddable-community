/**
 * Agent API Budget Validation System
 *
 * Enforces $10,000/month budget limit per organization.
 * Validates campaign budgets on creation and updates.
 */

import { createClient } from '@supabase/supabase-js'

// Maximum monthly budget per organization ($10,000)
export const MAX_MONTHLY_BUDGET = 10000

interface Campaign {
  id: number
  campaign_name: string
  budget: number
  start_date: string
  end_date: string
  created_by: string
}

interface BudgetCalculation {
  monthly_total: number
  campaigns: Campaign[]
}

interface BudgetValidationResult {
  valid: boolean
  monthly_limit: number
  current_total: number
  requested_amount: number
  available: number
  error_message?: string
  error_code?: string
  details?: any
}

/**
 * Get all users in an organization
 */
async function getOrganizationUsers(organizationId: string): Promise<string[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Error fetching organization users:', error)
    return []
  }

  return data.map(m => m.user_id)
}

/**
 * Check if a campaign's date range overlaps with a specific month
 */
function campaignOverlapsMonth(campaign: Campaign, year: number, month: number): boolean {
  const startDate = new Date(campaign.start_date)
  const endDate = new Date(campaign.end_date)

  // Create date range for the target month
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59) // Last day of month

  // Check if campaign dates overlap with the month
  return startDate <= monthEnd && endDate >= monthStart
}

/**
 * Calculate how much of a campaign's budget applies to a specific month
 *
 * For simplicity, we use the full campaign budget if it overlaps the month.
 * A more sophisticated approach would pro-rate based on days in the month.
 */
function getCampaignBudgetForMonth(campaign: Campaign, year: number, month: number): number {
  if (!campaignOverlapsMonth(campaign, year, month)) {
    return 0
  }

  // Simple approach: count full budget if campaign overlaps month
  // TODO: Pro-rate based on actual days in month for more accuracy
  return campaign.budget
}

/**
 * Calculate total monthly budget for an organization
 *
 * @param organizationId - The organization UUID
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12)
 * @param excludeCampaignId - Optional campaign ID to exclude (for updates)
 */
export async function calculateMonthlyBudget(
  organizationId: string,
  year: number,
  month: number,
  excludeCampaignId?: number
): Promise<BudgetCalculation> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all users in the organization
  const userIds = await getOrganizationUsers(organizationId)

  if (userIds.length === 0) {
    return { monthly_total: 0, campaigns: [] }
  }

  // Get all campaigns created by organization members
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, campaign_name, budget, start_date, end_date, created_by')
    .in('created_by', userIds)
    .neq('id', excludeCampaignId || -1)

  if (error) {
    console.error('Error fetching campaigns for budget calculation:', error)
    return { monthly_total: 0, campaigns: [] }
  }

  // Calculate total budget for campaigns overlapping the month
  const relevantCampaigns = campaigns.filter(c => campaignOverlapsMonth(c, year, month))
  const monthly_total = relevantCampaigns.reduce(
    (sum, campaign) => sum + getCampaignBudgetForMonth(campaign, year, month),
    0
  )

  return {
    monthly_total,
    campaigns: relevantCampaigns,
  }
}

/**
 * Validate if a campaign budget is within organizational limits
 *
 * @param organizationId - The organization UUID
 * @param newBudget - The budget amount to validate
 * @param startDate - Campaign start date (YYYY-MM-DD)
 * @param endDate - Campaign end date (YYYY-MM-DD)
 * @param campaignId - Optional campaign ID (for updates, excludes this campaign from calculation)
 */
export async function validateCampaignBudget(
  organizationId: string,
  newBudget: number,
  startDate: string,
  endDate: string,
  campaignId?: number
): Promise<BudgetValidationResult> {
  // Parse dates
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Get all affected months (campaigns can span multiple months)
  const affectedMonths: Array<{ year: number; month: number }> = []
  const current = new Date(start)

  while (current <= end) {
    affectedMonths.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1, // JavaScript months are 0-indexed
    })
    // Move to next month
    current.setMonth(current.getMonth() + 1)
  }

  // Check budget for each affected month
  for (const { year, month } of affectedMonths) {
    const calculation = await calculateMonthlyBudget(organizationId, year, month, campaignId)

    const newTotal = calculation.monthly_total + newBudget

    if (newTotal > MAX_MONTHLY_BUDGET) {
      return {
        valid: false,
        monthly_limit: MAX_MONTHLY_BUDGET,
        current_total: calculation.monthly_total,
        requested_amount: newBudget,
        available: Math.max(0, MAX_MONTHLY_BUDGET - calculation.monthly_total),
        error_code: 'BUDGET_EXCEEDED',
        error_message: `Campaign budget would exceed monthly limit of $${MAX_MONTHLY_BUDGET.toLocaleString()} for ${year}-${month.toString().padStart(2, '0')}`,
        details: {
          affected_month: `${year}-${month.toString().padStart(2, '0')}`,
          existing_campaigns: calculation.campaigns.map(c => ({
            id: c.id,
            name: c.campaign_name,
            budget: c.budget,
          })),
        },
      }
    }
  }

  // Budget is valid
  const firstMonth = affectedMonths[0]
  const calculation = await calculateMonthlyBudget(
    organizationId,
    firstMonth.year,
    firstMonth.month,
    campaignId
  )

  return {
    valid: true,
    monthly_limit: MAX_MONTHLY_BUDGET,
    current_total: calculation.monthly_total,
    requested_amount: newBudget,
    available: MAX_MONTHLY_BUDGET - calculation.monthly_total - newBudget,
  }
}

/**
 * Get remaining budget available for a specific month
 */
export async function getRemainingBudget(
  organizationId: string,
  year: number,
  month: number
): Promise<number> {
  const calculation = await calculateMonthlyBudget(organizationId, year, month)
  return Math.max(0, MAX_MONTHLY_BUDGET - calculation.monthly_total)
}

/**
 * Get budget status for an organization across multiple months
 */
export async function getBudgetStatus(
  organizationId: string,
  year?: number,
  month?: number
): Promise<{
  monthly_limit: number
  months: Array<{
    year: number
    month: number
    monthly_total: number
    remaining: number
    campaigns: Array<{
      id: number
      name: string
      budget: number
      start_date: string
      end_date: string
    }>
  }>
}> {
  // Default to current month if not specified
  const now = new Date()
  const targetYear = year || now.getFullYear()
  const targetMonth = month || now.getMonth() + 1

  // Get current month and next 2 months
  const months: Array<{ year: number; month: number }> = []
  const current = new Date(targetYear, targetMonth - 1, 1)

  for (let i = 0; i < 3; i++) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
    })
    current.setMonth(current.getMonth() + 1)
  }

  // Calculate budget for each month
  const results = await Promise.all(
    months.map(async ({ year, month }) => {
      const calculation = await calculateMonthlyBudget(organizationId, year, month)
      return {
        year,
        month,
        monthly_total: calculation.monthly_total,
        remaining: MAX_MONTHLY_BUDGET - calculation.monthly_total,
        campaigns: calculation.campaigns.map(c => ({
          id: c.id,
          name: c.campaign_name,
          budget: c.budget,
          start_date: c.start_date,
          end_date: c.end_date,
        })),
      }
    })
  )

  return {
    monthly_limit: MAX_MONTHLY_BUDGET,
    months: results,
  }
}

/**
 * Format budget validation error for API response
 */
export function formatBudgetError(validation: BudgetValidationResult) {
  return {
    success: false,
    error: {
      code: validation.error_code || 'BUDGET_EXCEEDED',
      message: validation.error_message || 'Budget validation failed',
      details: {
        monthly_limit: validation.monthly_limit,
        current_total: validation.current_total,
        requested: validation.requested_amount,
        available: validation.available,
        ...validation.details,
      },
      timestamp: new Date().toISOString(),
    },
  }
}
