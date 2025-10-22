import { Navigation } from '@/components/navigation'
import { CampaignDetailContent } from '@/components/campaign-detail-content'

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1">
        <CampaignDetailContent campaignId={params.id} />
      </main>
    </div>
  )
}
