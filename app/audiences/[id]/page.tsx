import { Navigation } from '@/components/navigation'
import { AudienceDetailContent } from '@/components/audience-detail-content'

export default function AudienceDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1">
        <AudienceDetailContent audienceId={params.id} />
      </main>
    </div>
  )
}
