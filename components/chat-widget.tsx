"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  text: string
  sender: "user" | "assistant"
  timestamp: Date
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [endpoint, setEndpoint] = useState("https://100.75.168.10:1234/v1/chat/completions")
  const [tempEndpoint, setTempEndpoint] = useState(endpoint)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm your biddable assistant. How can I help you today?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedEndpoint = localStorage.getItem("biddable-llm-endpoint")
    if (savedEndpoint) {
      setEndpoint(savedEndpoint)
      setTempEndpoint(savedEndpoint)
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSaveSettings = () => {
    setEndpoint(tempEndpoint)
    localStorage.setItem("biddable-llm-endpoint", tempEndpoint)
    setShowSettings(false)
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: endpoint,
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful biddable assistant for an advertising platform. Help users with campaign creation, management, and advertising questions.",
            },
            {
              role: "user",
              content: inputValue,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get response from assistant")
      }

      const data = await response.json()
      const assistantText =
        data.choices?.[0]?.message?.content?.trim() || "I'm sorry, I couldn't process that request. Please try again."

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: assistantText,
        sender: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("[v0] Error calling LLM API:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I'm having trouble connecting right now. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        sender: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-primary text-white p-4 shadow-lg hover:bg-primary/90 transition-colors z-50"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-card border border-border shadow-xl flex flex-col z-50">
          {/* Chat Header */}
          <div className="bg-primary text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">biddable Assistant</h3>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="hover:bg-white/20 p-1 transition-colors ml-1"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {showSettings && (
            <div className="bg-muted p-4 border-b border-border">
              <label className="text-sm font-medium text-foreground mb-2 block">LLM Endpoint</label>
              <Input
                value={tempEndpoint}
                onChange={(e) => setTempEndpoint(e.target.value)}
                placeholder="https://..."
                className="mb-2"
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveSettings} size="sm" className="flex-1 bg-primary hover:bg-primary/90">
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setTempEndpoint(endpoint)
                    setShowSettings(false)
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === "user" ? "bg-primary text-white" : "bg-muted text-foreground"
                  }`}
                >
                  <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    {message.sender === "assistant" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Custom styling for markdown elements
                          h1: ({ node, ...props }) => <h1 className="text-lg font-bold mt-2 mb-1" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-2 mb-1" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-sm font-bold mt-1 mb-1" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                          li: ({ node, ...props }) => <li className="ml-2" {...props} />,
                          code: ({ node, inline, ...props }: any) =>
                            inline ? (
                              <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs" {...props} />
                            ) : (
                              <code className="block bg-black/10 dark:bg-white/10 p-2 rounded text-xs my-2 overflow-x-auto" {...props} />
                            ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-2 border-foreground/20 pl-2 italic my-2" {...props} />
                          ),
                          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                          em: ({ node, ...props }) => <em className="italic" {...props} />,
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    ) : (
                      <p>{message.text}</p>
                    )}
                  </div>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 bg-muted text-foreground">
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
