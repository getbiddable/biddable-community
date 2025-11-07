"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Bot,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  User,
  Workflow,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

interface Conversation {
  id: string
  title: string | null
  status: string | null
  started_at: string | null
  last_message_at: string | null
  created_at: string | null
}

interface ToolCallSummary {
  id?: string
  name?: string
  args?: Record<string, unknown>
  result?: unknown
}

interface AgentMessage {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
  tool_calls?: ToolCallSummary[]
  isTemporary?: boolean
}

interface MessageRecord {
  id: number
  role: "user" | "assistant"
  content: string
  tool_calls: ToolCallSummary[] | null
  tool_results: Array<{ id?: string; result?: unknown }> | null
  created_at: string
}

const SUGGESTED_PROMPTS = [
  "Create a campaign for my winter clothing sale targeting young professionals.",
  "List the active campaigns and highlight any that are over budget.",
  "Assign the image asset #42 to the Spring Promo campaign.",
  "Summarize how much budget we have remaining for this month.",
]

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return typeof value === "string" ? value : String(value)
  }
}

export function AgentChatWidget() {
  const supabase = createClient()
  const { toast } = useToast()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [hasSelectedConversation, setHasSelectedConversation] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true)
    try {
      const { data, error } = await supabase
        .from("agent_conversations")
        .select("id, title, status, started_at, last_message_at, created_at")
        .order("last_message_at", { ascending: false })

      if (error) {
        throw error
      }

      const conversationList = (data ?? []) as Conversation[]
      setConversations(conversationList)

      if (!hasSelectedConversation && conversationList.length > 0) {
        setActiveConversationId(conversationList[0].id)
        setHasSelectedConversation(true)
      }
    } catch (error) {
      console.error("Failed to load agent conversations:", error)
      toast({
        variant: "destructive",
        title: "Unable to load conversations",
        description: error instanceof Error ? error.message : "Please try again shortly.",
      })
    } finally {
      setLoadingConversations(false)
    }
  }, [supabase, hasSelectedConversation, toast])

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true)
      try {
        const { data, error } = await supabase
          .from("agent_messages")
          .select("id, role, content, tool_calls, tool_results, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })

        if (error) {
          throw error
        }

        const normalizedMessages = (data ?? []).map((record: MessageRecord): AgentMessage => {
          const toolCalls = Array.isArray(record.tool_calls) ? record.tool_calls : []
          const toolResults = Array.isArray(record.tool_results) ? record.tool_results : []

          const callsWithResults = toolCalls.map(call => {
            const matchingResult = toolResults.find(result => result?.id && result.id === call?.id)

            if (matchingResult) {
              return {
                ...call,
                result:
                  Object.prototype.hasOwnProperty.call(matchingResult, "result") && matchingResult.result !== undefined
                    ? matchingResult.result
                    : matchingResult,
              }
            }

            return call
          })

          return {
            id: String(record.id),
            role: record.role,
            content: record.content,
            created_at: record.created_at,
            tool_calls: callsWithResults.length > 0 ? callsWithResults : undefined,
          }
        })

        setMessages(normalizedMessages)
      } catch (error) {
        console.error("Failed to load agent messages:", error)
        toast({
          variant: "destructive",
          title: "Unable to load conversation",
          description: error instanceof Error ? error.message : "Please try again shortly.",
        })
      } finally {
        setLoadingMessages(false)
      }
    },
    [supabase, toast]
  )

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      setLoadingMessages(false)
      return
    }

    fetchMessages(activeConversationId)
  }, [activeConversationId, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId)
    setHasSelectedConversation(true)
  }

  const handleStartNewConversation = () => {
    setActiveConversationId(null)
    setHasSelectedConversation(true)
    setMessages([])
    setInputValue("")
  }

  const handleDeleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent selecting the conversation

    if (!confirm('Delete this conversation? This cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('agent_conversations')
        .delete()
        .eq('id', conversationId)

      if (error) {
        throw error
      }

      // If deleting active conversation, clear it
      if (activeConversationId === conversationId) {
        setActiveConversationId(null)
        setMessages([])
      }

      // Refresh conversation list
      fetchConversations()

      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed.',
      })
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Could not delete conversation.',
      })
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isSending) {
      return
    }

    const temporaryId = `temp-${Date.now()}`
    const optimisticMessage: AgentMessage = {
      id: temporaryId,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
      isTemporary: true,
    }

    setMessages(prev => [...prev, optimisticMessage])
    setInputValue("")
    setIsSending(true)

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          conversation_id: activeConversationId ?? undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data?.success) {
        throw new Error(data?.error?.message || "Agent failed to respond")
      }

      const conversationId = data.data?.conversation_id as string
      const assistantText = data.data?.message as string
      const toolCalls = (data.data?.tool_calls as ToolCallSummary[]) ?? []

      setActiveConversationId(conversationId)
      setHasSelectedConversation(true)

      // Replace optimistic user message with persisted version once history reloads
      setMessages(prev =>
        prev
          .filter(message => message.id !== temporaryId)
          .concat([
            {
              id: `${conversationId}-user-${Date.now()}`,
              role: "user",
              content: trimmed,
              created_at: new Date().toISOString(),
            },
            {
              id: `${conversationId}-assistant-${Date.now()}`,
              role: "assistant",
              content: assistantText,
              created_at: new Date().toISOString(),
              tool_calls: toolCalls,
            },
          ])
      )

      // Refresh server state for accurate ordering and metadata
      fetchConversations()
      fetchMessages(conversationId)
    } catch (error) {
      console.error("Failed to send message to hosted agent:", error)
      setMessages(prev => prev.filter(message => message.id !== temporaryId))

      toast({
        variant: "destructive",
        title: "Message failed",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const renderSuggestions = () => (
    <Card className="p-6 bg-muted/30 border-dashed border-border/60">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        Try asking…
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {SUGGESTED_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => handleSuggestionClick(prompt)}
            className="rounded-lg border border-border/60 bg-background px-3 py-2 text-left text-sm transition hover:border-primary/50 hover:bg-primary/5"
          >
            {prompt}
          </button>
        ))}
      </div>
    </Card>
  )

  const renderEmptyState = () => (
    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border/60">
        <Bot className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-lg font-semibold text-foreground">Start a conversation</h2>
      <p className="mt-2 max-w-md text-sm">
        Ask the hosted agent to review campaigns, validate budgets, or walk you through creating new marketing
        initiatives. The agent can read data and create campaigns safely.
      </p>
      <div className="mt-6 w-full max-w-2xl">{renderSuggestions()}</div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-[600px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm md:flex-row">
      <aside className="w-full border-b border-border bg-muted/20 md:w-72 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            Conversations
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchConversations}
              disabled={loadingConversations}
              aria-label="Refresh conversations"
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", loadingConversations && "animate-spin")} />
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleStartNewConversation}
              aria-label="Start new conversation"
              className="h-8 gap-1.5 px-3"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs font-medium">New</span>
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)] max-h-[300px] md:h-[calc(100vh-10rem)] md:max-h-none">
          <div className="space-y-1 px-2 pb-4 pt-2 md:px-3">
            {loadingConversations ? (
              <div className="flex items-center gap-2 px-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading conversations…
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                No conversations yet. Start a new chat to begin working with the agent.
              </div>
            ) : (
              conversations.map(conversation => {
                const isActive = activeConversationId === conversation.id

                return (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group relative w-full rounded-md transition",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted/70"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conversation.id)}
                      className="w-full px-3 py-2 text-left text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex-1 font-medium leading-snug pr-8">
                          {conversation.title ?? "Untitled conversation"}
                        </span>
                        {conversation.last_message_at && (
                          <span className={cn(
                            "text-xs",
                            isActive ? "text-primary-foreground/70" : "text-muted-foreground/80"
                          )}>
                            {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      {conversation.status === "archived" && (
                        <Badge variant="outline" className="mt-2 bg-muted text-xs">
                          Archived
                        </Badge>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      className={cn(
                        "absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100",
                        "rounded p-1 hover:bg-destructive/10",
                        isActive && "text-primary-foreground hover:bg-destructive/20"
                      )}
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </aside>

      <section className="flex flex-1 flex-col">
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading conversation…
                </div>
              ) : messages.length === 0 ? (
                renderEmptyState()
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map(message => {
                    const isUser = message.role === "user"
                    const timestamp = message.created_at
                      ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
                      : ""

                    return (
                      <div
                        key={message.id}
                        className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-2xl rounded-lg border border-border/60 px-4 py-3 text-sm shadow-sm",
                            isUser
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/40 text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                            {isUser ? (
                              <User className="h-3.5 w-3.5" />
                            ) : (
                              <Bot className="h-3.5 w-3.5" />
                            )}
                            <span>{isUser ? "You" : "Ads Agent"}</span>
                            <span>•</span>
                            <span>{timestamp}</span>
                          </div>

                          <div className="prose prose-sm mt-2 max-w-none break-words dark:prose-invert">
                            {isUser ? (
                              <p>{message.content}</p>
                            ) : (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ node, ...props }) => <h1 className="text-lg font-semibold" {...props} />,
                                  h2: ({ node, ...props }) => <h2 className="text-base font-semibold" {...props} />,
                                  h3: ({ node, ...props }) => <h3 className="text-sm font-semibold" {...props} />,
                                  ul: ({ node, ...props }) => <ul className="ml-5 list-disc" {...props} />,
                                  ol: ({ node, ...props }) => <ol className="ml-5 list-decimal" {...props} />,
                                  code: ({ node, inline, ...props }: any) =>
                                    inline ? (
                                      <code className="rounded bg-black/10 px-1 py-0.5 text-xs dark:bg-white/10" {...props} />
                                    ) : (
                                      <code className="block rounded bg-black/10 p-3 text-xs dark:bg-white/10" {...props} />
                                    ),
                                  pre: ({ node, ...props }) => <pre className="rounded bg-muted p-3 text-xs" {...props} />,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            )}
                          </div>

                          {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {message.tool_calls.map((toolCall, index) => (
                                <div
                                  key={toolCall.id ?? `${message.id}-tool-${index}`}
                                  className="rounded-md border border-border/60 bg-background/90 p-3 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 font-semibold text-foreground">
                                      <Workflow className="h-3.5 w-3.5 text-primary" />
                                      <span>{toolCall.name ?? "Tool call"}</span>
                                    </div>
                                    <Badge variant="outline" className="bg-muted/60">
                                      Tool
                                    </Badge>
                                  </div>

                                  {toolCall.args && Object.keys(toolCall.args).length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                                        Arguments
                                      </div>
                                      <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted/60 p-2 text-[11px] leading-relaxed">
                                        {formatJson(toolCall.args)}
                                      </pre>
                                    </div>
                                  )}

                                  {toolCall.result !== undefined && toolCall.result !== null && (
                                    <div className="mt-2">
                                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                                        Result
                                      </div>
                                      <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted/40 p-2 text-[11px] leading-relaxed">
                                        {formatJson(toolCall.result)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {isSending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating response…
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-muted/20 px-4 py-4 md:px-6">
          <div className="rounded-lg border border-border/60 bg-background p-3 shadow-sm">
            <Textarea
              value={inputValue}
              onChange={event => setInputValue(event.target.value)}
              placeholder="Ask the agent to review campaigns, create a new campaign, or summarize budget performance…"
              className="min-h-[100px] resize-none border-none bg-transparent px-0 focus-visible:ring-0"
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="hidden text-xs text-muted-foreground md:block">
                Press <span className="rounded border border-border/60 bg-muted/50 px-1 py-0.5">Enter</span> to send,
                <span className="mx-1 rounded border border-border/60 bg-muted/50 px-1 py-0.5">Shift</span>
                +<span className="rounded border border-border/60 bg-muted/50 px-1 py-0.5">Enter</span> for a new line.
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={isSending || inputValue.trim().length === 0}
                className="gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
