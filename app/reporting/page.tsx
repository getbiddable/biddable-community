import { Navigation } from "@/components/navigation"
import { ReportingContent } from "@/components/reporting-content"

export default function Reporting() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1">
        <ReportingContent />
      </main>
    </div>
  )
}
