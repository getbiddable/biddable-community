import { Navigation } from "@/components/navigation"
import { DashboardContent } from "@/components/dashboard-content"

export default function Dashboard() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1">
        <DashboardContent />
      </main>
    </div>
  )
}
