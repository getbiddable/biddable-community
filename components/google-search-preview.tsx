"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TextAdData, AdFormat } from "@/lib/text-ads"

interface GoogleSearchPreviewProps {
  adData: TextAdData
  adFormat: AdFormat
}

export function GoogleSearchPreview({ adData, adFormat }: GoogleSearchPreviewProps) {
  // For RSA, show up to 3 headlines and 2 descriptions (as Google rotates them)
  // For ETA, show all headlines and descriptions
  const displayHeadlines = adData.headlines.slice(0, 3)
  const displayDescriptions = adData.descriptions.slice(0, 2)

  // Build the display URL
  const getDisplayUrl = () => {
    if (!adData.final_url) return "example.com"

    try {
      const url = new URL(adData.final_url)
      let displayUrl = url.hostname.replace("www.", "")

      if (adData.paths && adData.paths.length > 0) {
        const validPaths = adData.paths.filter((p) => p.trim() !== "")
        if (validPaths.length > 0) {
          displayUrl += " › " + validPaths.join(" › ")
        }
      }

      return displayUrl
    } catch {
      return "example.com"
    }
  }

  const hasContent =
    adData.headlines.some((h) => h.trim() !== "") ||
    adData.descriptions.some((d) => d.trim() !== "")

  return (
    <Card className="bg-white border border-gray-200">
      <CardContent className="p-6">
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Google Search Preview</p>
          {adFormat === "rsa" && (
            <p className="text-xs text-gray-500">
              Responsive Search Ads rotate headlines and descriptions. This shows one possible combination.
            </p>
          )}
        </div>

        {!hasContent ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Start adding headlines and descriptions to see preview</p>
          </div>
        ) : (
          <div className="bg-white p-4 rounded border border-gray-100">
            {/* Ad Label */}
            <div className="mb-1">
              <span className="text-xs font-bold text-gray-900 border border-gray-900 px-1 rounded">
                Ad
              </span>
            </div>

            {/* Display URL */}
            <div className="mb-1">
              <p className="text-sm text-green-700">{getDisplayUrl()}</p>
            </div>

            {/* Headlines */}
            {displayHeadlines.length > 0 && (
              <div className="mb-2">
                <h3 className="text-xl text-blue-600 hover:underline cursor-pointer">
                  {displayHeadlines.filter((h) => h.trim() !== "").join(" | ") || "Your headline here"}
                </h3>
              </div>
            )}

            {/* Descriptions */}
            {displayDescriptions.length > 0 && (
              <div>
                <p className="text-sm text-gray-600">
                  {displayDescriptions
                    .filter((d) => d.trim() !== "")
                    .join(" ")
                    .slice(0, 180) || "Your description here"}
                </p>
              </div>
            )}

            {/* Ad Extensions Placeholder (optional) */}
            <div className="mt-3 flex gap-4 text-xs text-gray-600">
              <span className="hover:underline cursor-pointer">Learn More</span>
              <span className="hover:underline cursor-pointer">Contact</span>
              <span className="hover:underline cursor-pointer">Products</span>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-xs text-blue-900">
            <strong>Note:</strong> The actual ad appearance may vary based on device, search query, and
            Google's optimization. {adFormat === "rsa" && "RSA shows different combinations to find what works best."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
