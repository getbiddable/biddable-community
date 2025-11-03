import { Navigation } from "@/components/navigation"
import { AssetCreatorContent } from "@/components/asset-creator-content"

export default function AssetCreator() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 pt-16 md:pt-0">
        <AssetCreatorContent />
      </main>
    </div>
  )
}
