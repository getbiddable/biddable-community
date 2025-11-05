/**
 * Agent Tool Definitions
 *
 * Defines the 11 safe tools available to the hosted agent.
 * These tools are read-only or create-only (no update/delete operations).
 *
 * Tool Categories:
 * - Campaigns: list, get, create
 * - Assets: list, get
 * - Audiences: list, get
 * - Assignments: assign asset, assign audience
 * - Budget: get status
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

/**
 * All available tools for the hosted agent
 */
export const AGENT_TOOLS: ChatCompletionTool[] = [
  // ============================================================================
  // CAMPAIGN TOOLS (3)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'list_campaigns',
      description: 'List all campaigns with optional filters. Returns campaign summary information.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'paused', 'completed'],
            description: 'Filter campaigns by status',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of campaigns to return (default: 50)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_campaign',
      description: 'Get detailed information about a specific campaign by ID.',
      parameters: {
        type: 'object',
        properties: {
          campaign_id: {
            type: 'number',
            description: 'The campaign ID to retrieve',
          },
        },
        required: ['campaign_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_campaign',
      description: 'Create a new campaign. Automatically validates against the $10,000 monthly budget limit. Requires campaign name, budget, start date, and end date.',
      parameters: {
        type: 'object',
        properties: {
          campaign_name: {
            type: 'string',
            description: 'Name of the campaign',
          },
          budget: {
            type: 'number',
            description: 'Campaign budget in USD',
          },
          start_date: {
            type: 'string',
            description: 'Campaign start date in YYYY-MM-DD format',
          },
          end_date: {
            type: 'string',
            description: 'Campaign end date in YYYY-MM-DD format',
          },
          description: {
            type: 'string',
            description: 'Optional campaign description',
          },
        },
        required: ['campaign_name', 'budget', 'start_date', 'end_date'],
      },
    },
  },

  // ============================================================================
  // ASSET TOOLS (2)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'list_assets',
      description: 'List all assets (images, videos, text ads) with optional filters.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['image', 'video', 'text'],
            description: 'Filter assets by type',
          },
          status: {
            type: 'string',
            enum: ['active', 'pending', 'rejected'],
            description: 'Filter assets by approval status',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of assets to return (default: 50)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_asset',
      description: 'Get detailed information about a specific asset by ID.',
      parameters: {
        type: 'object',
        properties: {
          asset_id: {
            type: 'number',
            description: 'The asset ID to retrieve',
          },
        },
        required: ['asset_id'],
      },
    },
  },

  // ============================================================================
  // AUDIENCE TOOLS (2)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'list_audiences',
      description: 'List all audience segments with optional filters.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive'],
            description: 'Filter audiences by status',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of audiences to return (default: 50)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_audience',
      description: 'Get detailed information about a specific audience by ID.',
      parameters: {
        type: 'object',
        properties: {
          audience_id: {
            type: 'number',
            description: 'The audience ID to retrieve',
          },
        },
        required: ['audience_id'],
      },
    },
  },

  // ============================================================================
  // ASSIGNMENT TOOLS (2)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'assign_asset_to_campaign',
      description: 'Assign an asset to a campaign. Creates the association between an asset and a campaign.',
      parameters: {
        type: 'object',
        properties: {
          campaign_id: {
            type: 'number',
            description: 'The campaign ID',
          },
          asset_id: {
            type: 'number',
            description: 'The asset ID to assign',
          },
        },
        required: ['campaign_id', 'asset_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_audience_to_campaign',
      description: 'Assign an audience to a campaign. Creates the association between an audience and a campaign.',
      parameters: {
        type: 'object',
        properties: {
          campaign_id: {
            type: 'number',
            description: 'The campaign ID',
          },
          audience_id: {
            type: 'number',
            description: 'The audience ID to assign',
          },
        },
        required: ['campaign_id', 'audience_id'],
      },
    },
  },

  // ============================================================================
  // BUDGET TOOLS (1)
  // ============================================================================
  {
    type: 'function',
    function: {
      name: 'get_budget_status',
      description: 'Get budget utilization status for the organization. Shows monthly budget limit, current spending, and remaining budget for the current and upcoming months.',
      parameters: {
        type: 'object',
        properties: {
          year: {
            type: 'number',
            description: 'Optional year (defaults to current year)',
          },
          month: {
            type: 'number',
            description: 'Optional month 1-12 (defaults to current month)',
          },
        },
      },
    },
  },
]

/**
 * Get all tool names that are allowed
 */
export function getAllowedToolNames(): string[] {
  return AGENT_TOOLS.map(tool => tool.function.name)
}

/**
 * Check if a tool is allowed
 */
export function isToolAllowed(toolName: string): boolean {
  return getAllowedToolNames().includes(toolName)
}

/**
 * Restricted operations that the agent CANNOT perform
 */
export const RESTRICTED_OPERATIONS = [
  'update_campaign',
  'delete_campaign',
  'update_asset',
  'delete_asset',
  'update_audience',
  'delete_audience',
]

/**
 * Get a helpful error message when a user tries to perform a restricted operation
 */
export function getRestrictionMessage(operation: string): string {
  if (operation.includes('update')) {
    return 'I can help you view existing resources and create new ones, but I cannot update existing resources. If you need to change something, please create a new resource with the updated information or ask a team member with full access.'
  }
  if (operation.includes('delete')) {
    return 'I cannot delete resources for safety reasons. If you need to remove something, please ask a team member with full access or deactivate it through the main dashboard.'
  }
  return 'This operation is not allowed for the hosted agent.'
}
