import { Navigation } from "@/components/navigation"
import { ProfileContent } from "@/components/profile-content"

export default function Profile() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 pt-16 md:pt-0">
        <ProfileContent />
      </main>
    </div>
  )
}
