/**
 * Hosted Agent Chat API
 *
 * POST /api/agent/chat
 *
 * Handles chat messages to the hosted agent.
 * - Authenticates user via Supabase session (cookies)
 * - Retrieves encrypted API key server-side
 * - Calls OpenAI with function calling
 * - Executes tools by calling Agent API server-side
 * - Stores conversation history in database
 *
 * Security:
 * - API key encrypted in database
 * - API key decrypted server-side only
 * - API key never sent to client or OpenAI
 * - User authentication via session cookies
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getOrCreateHostedAgentApiKey } from '@/lib/agent-api-keys'
import { callOpenAI, getSystemPrompt } from '@/lib/ai/openai-client'
import { AGENT_TOOLS } from '@/lib/ai/agent-tools'
import { executeMCPTool } from '@/lib/ai/mcp-client'
import type { Message } from '@/lib/ai/openai-client'
import { logger } from '@/lib/logger'

const HISTORY_LIMIT = 20 // Last N messages to include in context

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user via Supabase session
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to use the agent',
          },
        },
        { status: 401 }
      )
    }

    // 2. Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(id, name)')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_ORGANIZATION',
            message: 'You must be a member of an organization to use the agent',
          },
        },
        { status: 403 }
      )
    }

    const organizationId = orgMember.organization_id

    // 3. Get/create encrypted agent API key (server-side)
    let apiKey: string
    try {
      apiKey = await getOrCreateHostedAgentApiKey(organizationId)
    } catch (error) {
      logger.error('Failed to get hosted agent API key', error)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'API_KEY_ERROR',
            message: 'Failed to retrieve agent API key',
          },
        },
        { status: 500 }
      )
    }

    // 4. Parse message from request
    const body = await request.json()
    const userMessage = body.message as string
    const conversationId = body.conversation_id as string | undefined

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Message is required',
          },
        },
        { status: 400 }
      )
    }

    // Use service role client for database operations
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 5. Get or create conversation
    let currentConversationId = conversationId

    if (!currentConversationId) {
      // Create new conversation
      const { data: newConversation, error: conversationError } = await supabaseAdmin
        .from('agent_conversations')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          title: userMessage.substring(0, 100), // Use first part of message as title
          status: 'active',
        })
        .select('id')
        .single()

      console.log('=== CONVERSATION INSERT RESULT ===')
      console.log('Error:', conversationError)
      console.log('Error type:', typeof conversationError)
      console.log('Error keys:', Object.keys(conversationError || {}))
      console.log('Error stringified:', JSON.stringify(conversationError))
      console.log('Data:', newConversation)
      console.log('Data stringified:', JSON.stringify(newConversation))
      console.log('==================================')

      // Check if there's any error at all
      if (conversationError && Object.keys(conversationError).length > 0) {
        console.error('=== CONVERSATION CREATION ERROR ===')
        console.error('Error details:', conversationError)
        console.error('Error message:', conversationError.message)
        console.error('Error code:', conversationError.code)
        console.error('Organization ID:', organizationId)
        console.error('User ID:', user.id)
        console.error('===================================')

        logger.error('Failed to create conversation', conversationError)
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DATABASE_ERROR',
              message: `Failed to create conversation: ${conversationError.message || 'Unknown error'}`,
            },
          },
          { status: 500 }
        )
      }

      // Empty error object means Supabase returned an error but it's malformed
      if (conversationError && Object.keys(conversationError).length === 0) {
        console.error('=== EMPTY ERROR OBJECT ===')
        console.error('Supabase returned an error but it has no properties')
        console.error('This usually means the table does not exist or there is an RLS issue')
        console.error('Check if agent_conversations table exists in your database')
        console.error('==========================')
      }

      if (!newConversation) {
        console.error('=== NO CONVERSATION DATA RETURNED ===')
        console.error('Insert succeeded but no data returned')
        console.error('This might be an RLS or SELECT issue')
        console.error('Organization ID:', organizationId)
        console.error('User ID:', user.id)
        console.error('======================================')

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DATABASE_ERROR',
              message: 'Conversation created but unable to retrieve ID',
            },
          },
          { status: 500 }
        )
      }

      currentConversationId = newConversation.id
    }

    // 6. Save user message to database
    const { error: userMessageError } = await supabaseAdmin
      .from('agent_messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: userMessage,
      })

    if (userMessageError) {
      logger.error('Failed to save user message', userMessageError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to save message',
          },
        },
        { status: 500 }
      )
    }

    // 7. Fetch conversation history (last N messages)
    const { data: historyMessages, error: historyError } = await supabaseAdmin
      .from('agent_messages')
      .select('role, content, tool_calls, tool_results')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)

    if (historyError) {
      logger.error('Failed to fetch conversation history', historyError)
      // Continue anyway with just the current message
    }

    // 8. Build message array with system prompt
    const messages: Message[] = [
      {
        role: 'system',
        content: getSystemPrompt(),
      },
    ]

    // Debug: Log history from database
    console.error('[Agent Chat] History from database:')
    console.error(JSON.stringify(historyMessages, null, 2))

    // Add history in chronological order (oldest first)
    if (historyMessages && historyMessages.length > 0) {
      const chronologicalHistory = historyMessages.reverse()
      for (const msg of chronologicalHistory) {
        const baseMessage: Message = {
          role: msg.role as 'user' | 'assistant' | 'tool',
          content: msg.content,
        }

        // Convert tool_calls from database format to OpenAI format
        if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
          baseMessage.tool_calls = msg.tool_calls.map((tc: any) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            },
          }))
        }

        messages.push(baseMessage)

        // Reconstruct prior tool execution results for conversation context
        if (
          msg.role === 'assistant' &&
          Array.isArray(msg.tool_calls) &&
          Array.isArray(msg.tool_results)
        ) {
          for (const toolCall of msg.tool_calls as Array<{ id?: string; name?: string }>) {
            if (!toolCall?.id) continue

            const matchingResult = (msg.tool_results as Array<{ id?: string; result?: unknown }>).find(
              result => result?.id === toolCall.id
            )

            if (matchingResult) {
              const serializedResult =
                JSON.stringify(
                  Object.prototype.hasOwnProperty.call(matchingResult, 'result')
                    ? matchingResult.result
                    : matchingResult
                ) ?? 'null'

              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolCall.name || 'unknown',
                content: serializedResult,
              })
            }
          }
        }
      }
    }

    // 9. Call OpenAI with tools
    let assistantResponse: string
    const toolCalls: Array<{
      id: string
      name: string
      args: Record<string, unknown>
      result: unknown
    }> = []

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`

      assistantResponse = await callOpenAI({
        messages,
        tools: AGENT_TOOLS,
        onToolCall: async ({ id, name, args }) => {
          // 10. Execute tool calls via MCP server
          logger.info('Agent executing tool via MCP', { toolName: name, args })

          try {
            const result = await executeMCPTool(name, args)
            toolCalls.push({ id, name, args, result })
            return result
          } catch (error) {
            logger.error('MCP tool execution failed', { toolName: name, error })
            const errorResult = {
              error: error instanceof Error ? error.message : 'Tool execution failed',
            }
            toolCalls.push({ id, name, args, result: errorResult })
            return errorResult
          }
        },
      })
    } catch (error) {
      logger.error('OpenAI call failed', error)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_ERROR',
            message: 'Failed to generate response',
          },
        },
        { status: 500 }
      )
    }

    // 11. Save assistant response
    const { error: assistantMessageError } = await supabaseAdmin
      .from('agent_messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: assistantResponse,
        tool_calls:
          toolCalls.length > 0
            ? toolCalls.map(({ id, name, args }) => ({
                id,
                name,
                args,
              }))
            : null,
        tool_results:
          toolCalls.length > 0
            ? toolCalls.map(({ id, result }) => ({
                id,
                result,
              }))
            : null,
      })

    if (assistantMessageError) {
      logger.error('Failed to save assistant message', assistantMessageError)
      // Return response anyway since it was generated
    }

    // 12. Update conversation timestamp
    await supabaseAdmin
      .from('agent_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', currentConversationId)

    // 13. Return response to client
    return NextResponse.json({
      success: true,
      data: {
        message: assistantResponse,
        conversation_id: currentConversationId,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          name: tc.name,
          args: tc.args,
          result: tc.result,
        })),
      },
    })
  } catch (error) {
    logger.error('Unexpected error in chat API', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
