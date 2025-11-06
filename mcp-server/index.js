#!/usr/bin/env node

/**
 * Biddable Agent MCP Server
 *
 * Exposes 11 Agent API tools via Model Context Protocol (MCP).
 * Runs on localhost only for security - not exposed to internet.
 *
 * Usage:
 *   node index.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const AGENT_API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const AGENT_API_KEY = process.env.TEST_API_KEY;

if (!AGENT_API_KEY) {
  console.error('ERROR: TEST_API_KEY not found in environment');
  process.exit(1);
}

/**
 * MCP Tool Definitions - All 11 Biddable Agent Tools
 */
const TOOLS = [
  // Campaign Tools
  {
    name: 'list_campaigns',
    description: 'List all campaigns with optional filters. Returns campaign summary information.',
    inputSchema: {
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
  {
    name: 'get_campaign',
    description: 'Get detailed information about a specific campaign by ID.',
    inputSchema: {
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
  {
    name: 'create_campaign',
    description: 'Create a new campaign. Each campaign runs on ONE platform. Validates against $10,000 monthly budget limit.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_name: {
          type: 'string',
          description: 'Name of the campaign',
        },
        platform: {
          type: 'string',
          enum: ['google', 'youtube', 'reddit', 'meta'],
          description: 'Platform to run campaign on (single platform per campaign)',
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
        goal: {
          type: 'string',
          description: 'Optional campaign goal or description',
        },
      },
      required: ['campaign_name', 'platform', 'budget', 'start_date', 'end_date'],
    },
  },

  // Asset Tools
  {
    name: 'list_assets',
    description: 'List all assets (images, videos, text ads) with optional filters.',
    inputSchema: {
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
  {
    name: 'get_asset',
    description: 'Get detailed information about a specific asset by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        asset_id: {
          type: 'string',
          description: 'The asset UUID to retrieve',
        },
      },
      required: ['asset_id'],
    },
  },

  // Audience Tools
  {
    name: 'list_audiences',
    description: 'List all audience segments with optional filters.',
    inputSchema: {
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
  {
    name: 'get_audience',
    description: 'Get detailed information about a specific audience by ID.',
    inputSchema: {
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

  // Assignment Tools
  {
    name: 'assign_asset_to_campaign',
    description: 'Assign an asset to a campaign. Creates the association between an asset and a campaign.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: {
          type: 'number',
          description: 'The campaign ID',
        },
        asset_id: {
          type: 'string',
          description: 'The asset UUID to assign',
        },
      },
      required: ['campaign_id', 'asset_id'],
    },
  },
  {
    name: 'assign_audience_to_campaign',
    description: 'Assign an audience to a campaign. Creates the association between an audience and a campaign.',
    inputSchema: {
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

  // Budget Tool
  {
    name: 'get_budget_status',
    description: 'Get budget utilization status for the organization. Shows spending and remaining budget.',
    inputSchema: {
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
];

/**
 * Execute a tool by calling the Agent API
 */
async function executeTool(name, args) {
  const endpoint = getToolEndpoint(name, args);
  const method = getToolMethod(name);
  const body = getToolRequestBody(name, args);

  const url = `${AGENT_API_BASE}${endpoint}`;

  console.error(`[MCP] Executing ${name} -> ${method} ${url}`);

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT_API_KEY}`,
      },
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${data.error?.message || 'Request failed'}\n\n${JSON.stringify(data, null, 2)}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get API endpoint for a tool
 */
function getToolEndpoint(toolName, args) {
  switch (toolName) {
    case 'list_campaigns':
      return '/api/v1/agent/campaigns/list';
    case 'get_campaign':
      return `/api/v1/agent/campaigns/${args.campaign_id}/get`;
    case 'create_campaign':
      return '/api/v1/agent/campaigns/create';
    case 'list_assets':
      return '/api/v1/agent/assets/list';
    case 'get_asset':
      return `/api/v1/agent/assets/${args.asset_id}/get`;
    case 'list_audiences':
      return '/api/v1/agent/audiences/list';
    case 'get_audience':
      return `/api/v1/agent/audiences/${args.audience_id}/get`;
    case 'assign_asset_to_campaign':
      return `/api/v1/agent/campaigns/${args.campaign_id}/assets`;
    case 'assign_audience_to_campaign':
      return `/api/v1/agent/campaigns/${args.campaign_id}/audiences`;
    case 'get_budget_status':
      return '/api/v1/agent/budget/status';
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Get HTTP method for a tool
 */
function getToolMethod(toolName) {
  const postTools = [
    'create_campaign',
    'assign_asset_to_campaign',
    'assign_audience_to_campaign',
  ];
  return postTools.includes(toolName) ? 'POST' : 'GET';
}

/**
 * Get request body for POST tools
 */
function getToolRequestBody(toolName, args) {
  switch (toolName) {
    case 'create_campaign':
      return {
        name: args.campaign_name,
        platforms: [args.platform], // Wrap single platform in array
        budget: args.budget,
        start_date: args.start_date,
        end_date: args.end_date,
        goal: args.goal,
      };
    case 'assign_asset_to_campaign':
      return {
        asset_id: args.asset_id,
      };
    case 'assign_audience_to_campaign':
      return {
        audience_id: args.audience_id,
      };
    default:
      return null;
  }
}

/**
 * Create and run MCP Server
 */
async function main() {
  const server = new Server(
    {
      name: 'biddable-agent',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    console.error(`[MCP] Tool called: ${name}`);
    console.error(`[MCP] Arguments:`, JSON.stringify(args, null, 2));

    try {
      return await executeTool(name, args || {});
    } catch (error) {
      console.error(`[MCP] Error:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start server with stdio transport (for Claude Desktop, etc.)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP] Biddable Agent MCP Server running on stdio');
  console.error('[MCP] API Base:', AGENT_API_BASE);
  console.error('[MCP] Ready for connections');
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
