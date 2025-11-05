import { Navigation } from '@/components/navigation'
import AgentAnalyticsDashboard from '@/components/agent-analytics-dashboard'

export const metadata = {
  title: 'Agent Analytics | Biddable',
  description: 'Analytics and insights for agent API usage (Internal Only)',
}

export default function AgentAnalyticsPage() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 pt-16 md:pt-0">
        <AgentAnalyticsDashboard />
      </main>
    </div>
  )
}
