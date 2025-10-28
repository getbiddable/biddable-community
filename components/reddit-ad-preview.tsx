"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, MoreHorizontal, ArrowUp, ArrowDown, Share2 } from "lucide-react"
import { MessageSquare as CommentIcon } from "lucide-react"

interface RedditAdPreviewProps {
  headline: string
  callToAction: string
  destinationUrl: string
  displayUrl?: string
  imagePreview?: string | null
}

export function RedditAdPreview({
  headline,
  callToAction,
  destinationUrl,
  displayUrl,
  imagePreview,
}: RedditAdPreviewProps) {
  // Extract display URL from destination URL if not provided
  const getDisplayUrl = () => {
    if (displayUrl) return displayUrl
    if (destinationUrl && destinationUrl !== "https://") {
      try {
        const url = new URL(destinationUrl)
        return url.hostname
      } catch {
        return "your-website.com"
      }
    }
    return "your-website.com"
  }

  // Format CTA text
  const formatCTA = (cta: string) => {
    if (!cta) return "Learn More"
    return cta
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-[#FF4500]" />
          <span>Reddit Ad Preview</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile Reddit UI Preview */}
        <div className="bg-[#DAE0E6] rounded-2xl p-4 max-w-md mx-auto">
          {/* Reddit Header */}
          <div className="bg-[#C8CBCD] rounded-t-2xl p-4 mb-4 flex items-center space-x-2">
            <div className="flex-1 flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-xs">☰</span>
              </div>
              <div className="flex-1 bg-white rounded-full px-3 py-2 flex items-center">
                <span className="text-sm text-gray-400">Search</span>
              </div>
            </div>
            <div className="w-8 h-8 bg-[#FF4500] rounded-full flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Reddit Post Card */}
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            {/* Post Header */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#0DD3BB] rounded-full" />
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium text-gray-900">u/GetBiddable</span>
                  <span className="text-xs text-gray-500">Promoted</span>
                </div>
              </div>
              <MoreHorizontal className="h-5 w-5 text-gray-400" />
            </div>

            {/* Headline */}
            <div className="px-3 pb-3">
              <h3 className="text-base font-medium text-gray-900">
                {headline || "This is a headline"}
              </h3>
            </div>

            {/* Image */}
            <div className="w-full bg-[#E8F0F5] aspect-square flex items-center justify-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Ad preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-8">
                  <div className="w-24 h-24 mx-auto bg-[#0DD3BB] rounded-2xl flex items-center justify-center mb-2">
                    <span className="text-5xl font-bold text-white">b.</span>
                  </div>
                  <p className="text-xs text-gray-400">Image preview</p>
                </div>
              )}
            </div>

            {/* Footer with URL and CTA */}
            <div className="p-3 flex items-center justify-between border-t border-gray-100">
              <span className="text-sm text-gray-700">{getDisplayUrl()}</span>
              <button className="px-4 py-1.5 bg-white border-2 border-[#0045AC] text-[#0045AC] rounded-full text-sm font-bold hover:bg-[#0045AC] hover:text-white transition-colors">
                {formatCTA(callToAction) || "Learn More"}
              </button>
            </div>

            {/* Interaction Bar */}
            <div className="px-3 pb-3 flex items-center justify-between border-t border-gray-100 pt-2">
              <div className="flex items-center space-x-1">
                <ArrowUp className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Vote</span>
                <ArrowDown className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex items-center space-x-1">
                <CommentIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">0</span>
              </div>
              <div className="flex items-center space-x-1">
                <Share2 className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">Share</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info text */}
        <div className="mt-4 bg-[#FF4500]/5 border border-[#FF4500]/20 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Preview:</strong> This shows how your ad will appear on Reddit mobile. The actual appearance may vary slightly based on user settings and Reddit updates.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
