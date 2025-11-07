/**
 * OpenAI Client for Hosted Agent
 *
 * Handles chat completions with function calling (tools) support.
 * Uses GPT-4 Turbo for intelligent campaign management.
 *
 * Supports local LLM endpoints via OPENAI_BASE_URL environment variable.
 */

import OpenAI from 'openai'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'

// Support local LLM endpoints
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-local-llm',
  baseURL: process.env.OPENAI_BASE_URL, // e.g., https://your-ngrok-url.ngrok.io/v1
})

// Allow custom model via env var (useful for local LLMs)
const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
  tool_call_id?: string
  name?: string
}

export interface ChatOptions {
  messages: Message[]
  tools?: ChatCompletionTool[]
  onToolCall?: (toolCall: {
    id: string
    name: string
    args: Record<string, unknown>
  }) => Promise<unknown>
  maxIterations?: number
}

/**
 * Call OpenAI with function calling support
 *
 * Handles multi-turn conversations with tool execution.
 * Will automatically execute tools via the onToolCall callback
 * and continue the conversation until a final response is generated.
 *
 * @param options - Chat configuration
 * @returns The final assistant response
 */
export async function callOpenAI(options: ChatOptions): Promise<string> {
  const {
    messages,
    tools = [],
    onToolCall,
    maxIterations = 10, // Prevent infinite loops
  } = options

  let currentMessages: ChatCompletionMessageParam[] = messages.map(msg => {
    // Convert our Message format to OpenAI's format
    if (msg.tool_calls) {
      return {
        role: msg.role,
        content: msg.content || null,
        tool_calls: msg.tool_calls,
      } as ChatCompletionMessageParam
    }
    if (msg.tool_call_id) {
      // Note: name field required by some LLM APIs (Qwen, etc.)
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.tool_call_id,
        name: msg.name,
      } as any
    }
    return {
      role: msg.role,
      content: msg.content,
    } as ChatCompletionMessageParam
  })

  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    // Debug: Log messages being sent to LLM
    console.error('[OpenAI Client] Sending messages to LLM:')
    console.error(JSON.stringify(currentMessages, null, 2))

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: currentMessages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: 2000,
    })

    const choice = response.choices[0]
    const message = choice.message

    // Add assistant's response to messages
    currentMessages.push(message)

    // Check if we're done (no tool calls)
    if (choice.finish_reason === 'stop' || !message.tool_calls) {
      return message.content || 'No response generated'
    }

    // Execute tool calls
    if (message.tool_calls && onToolCall) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          const toolName = toolCall.function.name
          const toolArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>

          try {
            // Execute the tool
            const result = await onToolCall({
              id: toolCall.id,
              name: toolName,
              args: toolArgs,
            })

            // Add tool result to messages
            // Note: name field required by some LLM APIs (Qwen, etc.)
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(result),
            } as any)
          } catch (error) {
            // Add error as tool result
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            } as any)
          }
        }
      }
    } else if (message.tool_calls && !onToolCall) {
      // Tool calls requested but no handler provided
      throw new Error('Tool calls requested but no onToolCall handler provided')
    }
  }

  throw new Error(`Maximum iterations (${maxIterations}) reached without completion`)
}

/**
 * Get the system prompt for the hosted agent
 */
export function getSystemPrompt(): string {
  return `You are a helpful campaign management assistant for the Biddable advertising platform.

You have access to 11 function tools that you MUST use to retrieve data and perform actions. Never fabricate information.

AVAILABLE TOOLS:
Campaign Tools:
  • list_campaigns - List all campaigns with optional filters (status, limit)
  • get_campaign - Get detailed information about a specific campaign by ID
  • create_campaign - Create a new campaign (requires: campaign_name, platform "google"|"youtube"|"reddit"|"meta", budget, start_date, end_date)

Asset Tools:
  • list_assets - List all assets (images, videos, text ads) with optional filters (type, status, limit)
  • get_asset - Get detailed information about a specific asset by ID

Audience Tools:
  • list_audiences - List all audience segments with optional filters (status, limit)
  • get_audience - Get detailed information about a specific audience by ID

Assignment Tools:
  • assign_asset_to_campaign - Link an asset to a campaign (requires: campaign_id, asset_id)
  • assign_audience_to_campaign - Link an audience to a campaign (requires: campaign_id, audience_id)

Budget Tools:
  • get_budget_status - View budget utilization for current and upcoming months

TOOL USAGE RULES:
1. ALWAYS call tools to retrieve data - NEVER invent campaign IDs, names, budgets, or other details
2. When a user asks "what campaigns do I have?" → call list_campaigns
3. When a user asks "show me campaign 123" → call get_campaign with campaign_id: 123
4. When a user asks "create a campaign" → collect all required fields, then call create_campaign
5. When a user asks "assign asset X to campaign Y" → call assign_asset_to_campaign
6. After calling a tool, summarize the results in plain language

IMPORTANT RESTRICTIONS:
- You can READ and CREATE resources, but you CANNOT UPDATE or DELETE anything
- If asked to modify or delete, explain you can only create new resources or view existing ones
- Monthly budget limit is $10,000 per organization - validate before creating campaigns
- All campaigns require: campaign_name, platform (single: "google", "youtube", "reddit", or "meta"), budget, start_date, end_date
- Each campaign runs on ONE platform only - if user wants multiple platforms, create separate campaigns

WORKFLOW EXAMPLES:
User: "What campaigns do I have?"
→ Call list_campaigns, then summarize the results

User: "Create a summer campaign"
→ Ask for: budget, start_date, end_date, platforms
→ Once collected, call create_campaign
→ Confirm campaign was created with the returned ID

User: "Show me asset 123"
→ Call get_asset with asset_id: "123"
→ Display the asset details

Be friendly, helpful, and proactive. Always use tools to get accurate data.`
}
