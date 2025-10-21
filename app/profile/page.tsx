import { Navigation } from "@/components/navigation"
import { ProfileContent } from "@/components/profile-content"

export default function Profile() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1">
        <ProfileContent />
      </main>
    </div>
  )
}
