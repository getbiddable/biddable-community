import { Navigation } from "@/components/navigation"
import { ReportingContent } from "@/components/reporting-content"

export default function Reporting() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 pt-16 md:pt-0">
        <ReportingContent />
      </main>
    </div>
  )
}
