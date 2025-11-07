import { Navigation } from '@/components/navigation'
import AgentLogsViewer from '@/components/agent-logs-viewer'

export const metadata = {
  title: 'Agent Audit Logs | Biddable',
  description: 'View audit logs for all agent API actions (Internal Only)',
}

export default function AgentLogsPage() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 pt-16 md:pt-0">
        <AgentLogsViewer />
      </main>
    </div>
  )
}
