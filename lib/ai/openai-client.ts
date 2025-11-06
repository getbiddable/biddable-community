/**
 * OpenAI Client for Hosted Agent
 *
 * Handles chat completions with function calling (tools) support.
 * Uses GPT-4 Turbo for intelligent campaign management.
 */

import OpenAI from 'openai'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const MODEL = 'gpt-4-turbo-preview'

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
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.tool_call_id,
      } as ChatCompletionMessageParam
    }
    return {
      role: msg.role,
      content: msg.content,
    } as ChatCompletionMessageParam
  })

  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

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
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            })
          } catch (error) {
            // Add error as tool result
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            })
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

Your role is to help users:
- View and analyze their campaigns, assets, and audiences
- Create new campaigns with proper budget validation
- Assign assets and audiences to campaigns
- Monitor budget utilization and spending

IMPORTANT RESTRICTIONS:
- You can READ and CREATE resources, but you CANNOT UPDATE or DELETE anything
- If a user asks you to modify or delete a campaign, politely explain that you can only create new campaigns or view existing ones
- Always validate budgets before creating campaigns - the monthly limit is $10,000 per organization
- When creating campaigns, ensure all required fields are provided (name, budget, start_date, end_date)

CAPABILITIES:
✅ List campaigns, assets, and audiences
✅ Get details about specific resources
✅ Create new campaigns (with budget validation)
✅ Assign assets to campaigns
✅ Assign audiences to campaigns
✅ Check budget status and utilization

❌ Update campaigns, assets, or audiences
❌ Delete campaigns, assets, or audiences
❌ Override budget limits

Be friendly, helpful, and proactive. When users ask about campaigns, offer to show them relevant information. When they want to create campaigns, guide them through the process and validate budgets automatically.`
}
