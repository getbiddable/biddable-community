import type { Metadata } from "next"

import { Navigation } from "@/components/navigation"
import { AgentChatWidget } from "@/components/agent-chat-widget"

export const metadata: Metadata = {
  title: "Campaign Agent • biddable.",
  description: "Collaborate with the hosted agent to inspect campaigns, validate budgets, and create new initiatives.",
}

export default function AgentChatPage() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 px-4 pb-6 pt-4 md:px-8 md:pb-8">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Campaign Agent</h1>
            <p className="text-sm text-muted-foreground">
              Chat with the hosted agent to review performance, enforce budget limits, and create new campaigns safely.
            </p>
          </header>
          <AgentChatWidget />
        </div>
      </main>
    </div>
  )
}
