import { Navigation } from '@/components/navigation'
import { CampaignDetailContent } from '@/components/campaign-detail-content'

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 pt-16 md:pt-0">
        <CampaignDetailContent campaignId={params.id} />
      </main>
    </div>
  )
}
