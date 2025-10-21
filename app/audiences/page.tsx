import { Navigation } from '@/components/navigation'
import { AudiencesContent } from '@/components/audiences-content'

export default function AudiencesPage() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1">
        <AudiencesContent />
      </main>
    </div>
  )
}
