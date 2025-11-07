import { Navigation } from "@/components/navigation"
import { DashboardContent } from "@/components/dashboard-content"

export default function Dashboard() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 pt-16 md:pt-0">
        <DashboardContent />
      </main>
    </div>
  )
}
