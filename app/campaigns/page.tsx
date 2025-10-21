import { Navigation } from '@/components/navigation'
import { CampaignsContent } from '@/components/campaigns-content'

export default function CampaignsPage() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1">
        <CampaignsContent />
      </main>
    </div>
  )
}
