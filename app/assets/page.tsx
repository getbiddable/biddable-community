import { Navigation } from "@/components/navigation"
import { AssetCreatorContent } from "@/components/asset-creator-content"

export default function AssetCreator() {
  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1">
        <AssetCreatorContent />
      </main>
    </div>
  )
}
