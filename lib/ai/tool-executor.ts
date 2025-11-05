/**
 * Agent Tool Executor
 *
 * Executes agent tools by calling the Agent API endpoints.
 * All tool execution happens server-side with the encrypted API key.
 *
 * Security:
 * - API key is decrypted server-side only
 * - Never exposed to client or LLM
 * - All requests go through Agent API middleware
 * - Rate limiting and audit logging are automatic
 */

import { isToolAllowed } from './agent-tools'

export interface ToolExecutionContext {
  apiKey: string // Decrypted API key (server-side only!)
  organizationId: string
  userId: string
  baseUrl: string // e.g., http://localhost:3000 or https://biddable.app
}

/**
 * Execute an agent tool by calling the appropriate Agent API endpoint
 *
 * @param toolName - The name of the tool to execute
 * @param args - The arguments for the tool
 * @param context - Execution context with API key and org info
 * @returns The result from the Agent API
 */
export async function executeAgentTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<unknown> {
  // Validate tool is allowed
  if (!isToolAllowed(toolName)) {
    throw new Error(`Tool "${toolName}" is not allowed`)
  }

  const { apiKey, baseUrl } = context

  // Map tool names to Agent API endpoints
  const endpoint = mapToolToEndpoint(toolName, args)
  const method = getToolMethod(toolName)

  // Build request
  const url = `${baseUrl}${endpoint}`
  const headers: HeadersInit = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  const requestOptions: RequestInit = {
    method,
    headers,
  }

  // Add body for POST requests
  if (method === 'POST') {
    requestOptions.body = JSON.stringify(getToolRequestBody(toolName, args))
  }

  try {
    // Call Agent API
    const response = await fetch(url, requestOptions)

    // Parse response
    const data = await response.json()

    if (!response.ok) {
      // API returned an error
      throw new Error(
        data.error?.message || `Agent API error: ${response.status} ${response.statusText}`
      )
    }

    // Return the data portion of the response
    return data.data || data
  } catch (error) {
    // Re-throw with context
    throw new Error(
      `Failed to execute tool "${toolName}": ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Map tool name and args to Agent API endpoint
 */
function mapToolToEndpoint(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    // Campaign tools
    case 'list_campaigns':
      return buildQueryString('/api/v1/agent/campaigns/list', {
        status: args.status as string | undefined,
        limit: args.limit as number | undefined,
      })

    case 'get_campaign':
      return `/api/v1/agent/campaigns/${args.campaign_id}/get`

    case 'create_campaign':
      return '/api/v1/agent/campaigns/create'

    // Asset tools
    case 'list_assets':
      return buildQueryString('/api/v1/agent/assets/list', {
        type: args.type as string | undefined,
        status: args.status as string | undefined,
        limit: args.limit as number | undefined,
      })

    case 'get_asset':
      // Note: This endpoint may need to be created if it doesn't exist
      return `/api/v1/agent/assets/${args.asset_id}/get`

    // Audience tools
    case 'list_audiences':
      return buildQueryString('/api/v1/agent/audiences/list', {
        status: args.status as string | undefined,
        limit: args.limit as number | undefined,
      })

    case 'get_audience':
      // Note: This endpoint may need to be created if it doesn't exist
      return `/api/v1/agent/audiences/${args.audience_id}/get`

    // Assignment tools
    case 'assign_asset_to_campaign':
      return `/api/v1/agent/campaigns/${args.campaign_id}/assets`

    case 'assign_audience_to_campaign':
      return `/api/v1/agent/campaigns/${args.campaign_id}/audiences`

    // Budget tools
    case 'get_budget_status':
      return buildQueryString('/api/v1/agent/budget/status', {
        year: args.year as number | undefined,
        month: args.month as number | undefined,
      })

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

/**
 * Get HTTP method for tool
 */
function getToolMethod(toolName: string): string {
  const postTools = [
    'create_campaign',
    'assign_asset_to_campaign',
    'assign_audience_to_campaign',
  ]
  return postTools.includes(toolName) ? 'POST' : 'GET'
}

/**
 * Get request body for POST tools
 */
function getToolRequestBody(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
  switch (toolName) {
    case 'create_campaign':
      return {
        campaign_name: args.campaign_name,
        budget: args.budget,
        start_date: args.start_date,
        end_date: args.end_date,
        description: args.description,
      }

    case 'assign_asset_to_campaign':
      return {
        asset_id: args.asset_id,
      }

    case 'assign_audience_to_campaign':
      return {
        audience_id: args.audience_id,
      }

    default:
      return args
  }
}

/**
 * Build URL with query string from params
 */
function buildQueryString(
  baseUrl: string,
  params: Record<string, string | number | undefined>
): string {
  const queryParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      queryParams.append(key, String(value))
    }
  }

  const queryString = queryParams.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}
