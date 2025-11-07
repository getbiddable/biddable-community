"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, ImageIcon, Video, FileText, Palette, Eye, Sparkles, MessageSquare } from "lucide-react"
import { TextAdForm } from "@/components/text-ad-form"
import { GoogleSearchPreview } from "@/components/google-search-preview"
import { ImageUploadForm } from "@/components/image-upload-form"
import { AIImageForm } from "@/components/ai-image-form"
import { RedditAdForm, RedditAdPreviewData } from "@/components/reddit-ad-form"
import { RedditAdPreview } from "@/components/reddit-ad-preview"
import { TextAdData, AdFormat } from "@/lib/text-ads"
import { useAuth } from "@/lib/auth-context"

interface AdAsset {
  id: string
  name: string
  type: "image" | "video" | "text"
  format: string | null
  size: string | null
  status: "draft" | "approved" | "rejected"
  created_at: string
  user_id: string
  organization_id: string
  ad_format?: string | null
  ad_data?: any
  file_url?: string | null
}

export function AssetCreatorContent() {
  const { user } = useAuth()
  const [assets, setAssets] = useState<AdAsset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [activeTab, setActiveTab] = useState<"create" | "library">("create")
  const [assetType, setAssetType] = useState<"image" | "video" | "text" | "ai-generate" | "reddit">("image")
  const [libraryFilter, setLibraryFilter] = useState<"all" | "ads" | "images">("all")

  // State for text ad preview
  const [textAdPreviewData, setTextAdPreviewData] = useState<TextAdData>({
    headlines: [],
    descriptions: [],
    paths: [],
  })
  const [textAdPreviewFormat, setTextAdPreviewFormat] = useState<AdFormat>("rsa")

  // State for Reddit ad preview
  const [redditAdPreviewData, setRedditAdPreviewData] = useState<RedditAdPreviewData>({
    headline: "",
    callToAction: "",
    destinationUrl: "https://",
    displayUrl: "",
    imagePreview: null,
  })

  // Fetch assets when library tab is opened
  useEffect(() => {
    if (activeTab === "library") {
      fetchAssets()
    }
  }, [activeTab])

  const fetchAssets = async () => {
    setLoadingAssets(true)
    try {
      const response = await fetch("/api/assets")
      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets || [])
      } else {
        console.error("Failed to fetch assets")
      }
    } catch (error) {
      console.error("Error fetching assets:", error)
    } finally {
      setLoadingAssets(false)
    }
  }

  const handleTextAdSubmit = async (data: TextAdData, format: AdFormat, name: string) => {
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type: "text",
          ad_format: format,
          ad_data: data,
          format: format.toUpperCase(),
          size: `${data.headlines.length} headlines, ${data.descriptions.length} descriptions`,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("Error creating asset:", result.error)
        alert(`Error: ${result.error}`)
        return
      }

      console.log("Asset created successfully:", result.asset)
      alert(`Text ad "${name}" created successfully!`)

      // Refresh the asset list if on library tab
      if (activeTab === "library") {
        fetchAssets()
      }
    } catch (error) {
      console.error("Error submitting text ad:", error)
      alert("Failed to create text ad. Please try again.")
    }
  }

  const handleTextAdPreview = useCallback((data: TextAdData, format: AdFormat) => {
    setTextAdPreviewData(data)
    setTextAdPreviewFormat(format)
  }, [])

  const handleRedditAdPreview = useCallback((data: RedditAdPreviewData) => {
    setRedditAdPreviewData(data)
  }, [])

  // Filter assets based on library filter
  const filteredAssets = assets.filter((asset) => {
    if (libraryFilter === "all") return true
    if (libraryFilter === "ads") return asset.type === "text" || asset.type === "reddit_ad"
    if (libraryFilter === "images") return asset.type === "image" || asset.type === "video"
    return true
  })

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Creative</h1>
          <p className="text-muted-foreground mt-1">Create and manage your ad assets</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === "create" ? "default" : "outline"}
            onClick={() => setActiveTab("create")}
            className={activeTab === "create" ? "bg-primary hover:bg-primary-hover text-white" : ""}
          >
            Create Asset
          </Button>
          <Button
            variant={activeTab === "library" ? "default" : "outline"}
            onClick={() => setActiveTab("library")}
            className={activeTab === "library" ? "bg-primary hover:bg-primary-hover text-white" : ""}
          >
            Asset Library
          </Button>
        </div>
      </div>

      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Asset Creation Form */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Create New Asset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-foreground">Asset Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(["ai-generate", "image", "text", "reddit", "video"] as const).map((type) => (
                    <Button
                      key={type}
                      variant={assetType === type ? "default" : "outline"}
                      onClick={() => setAssetType(type)}
                      className={`flex items-center space-x-2 ${
                        assetType === type ? "bg-primary hover:bg-primary-hover text-white" : ""
                      }`}
                    >
                      {type === "ai-generate" && <Sparkles className="h-4 w-4" />}
                      {type === "image" && <ImageIcon className="h-4 w-4" />}
                      {type === "video" && <Video className="h-4 w-4" />}
                      {type === "text" && <FileText className="h-4 w-4" />}
                      {type === "reddit" && <MessageSquare className="h-4 w-4" />}
                      <span className="capitalize">{type === "ai-generate" ? "AI Generate" : type}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {assetType === "ai-generate" && <AIImageForm onSuccess={fetchAssets} />}

              {assetType === "image" && <ImageUploadForm onSuccess={fetchAssets} />}

              {assetType === "video" && (
                <>
                  <div>
                    <Label className="text-foreground">Video Format</Label>
                    <Select>
                      <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">Square (1080x1080)</SelectItem>
                        <SelectItem value="landscape">Landscape (1920x1080)</SelectItem>
                        <SelectItem value="portrait">Portrait (1080x1920)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border-2 border-dashed border-border p-8 text-center">
                    <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">Drop your video here or click to upload</p>
                    <Button variant="outline">Choose File</Button>
                  </div>
                </>
              )}

              {assetType === "text" && (
                <TextAdForm onSubmit={handleTextAdSubmit} onPreview={handleTextAdPreview} />
              )}

              {assetType === "reddit" && (
                <RedditAdForm onSuccess={fetchAssets} onPreview={handleRedditAdPreview} />
              )}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          {assetType === "text" ? (
            <GoogleSearchPreview adData={textAdPreviewData} adFormat={textAdPreviewFormat} />
          ) : assetType === "reddit" ? (
            <RedditAdPreview
              headline={redditAdPreviewData.headline}
              callToAction={redditAdPreviewData.callToAction}
              destinationUrl={redditAdPreviewData.destinationUrl}
              displayUrl={redditAdPreviewData.displayUrl}
              imagePreview={redditAdPreviewData.imagePreview}
            />
          ) : assetType === "ai-generate" ? (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>AI Generation Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-background border border-border p-8 rounded-lg space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">How AI Image Generation Works</h3>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-start">
                          <span className="text-primary mr-2">1.</span>
                          <span>Provide details about your product and brand</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary mr-2">2.</span>
                          <span>Our AI will analyze your requirements</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary mr-2">3.</span>
                          <span>Custom images will be generated and added to your asset library</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary mr-2">4.</span>
                          <span>You'll receive a notification when images are ready</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Tip:</strong> Be specific about your product features and brand style to get the best results.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Asset Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-background border border-border p-8 text-center min-h-64 flex items-center justify-center">
                  <div className="text-muted-foreground">
                    <div className="mb-4">
                      {assetType === "image" && <ImageIcon className="mx-auto h-16 w-16" />}
                      {assetType === "video" && <Video className="mx-auto h-16 w-16" />}
                    </div>
                    <p>Asset preview will appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "library" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Asset Library</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant={libraryFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLibraryFilter("all")}
                  className={libraryFilter === "all" ? "bg-primary hover:bg-primary-hover text-white" : ""}
                >
                  All
                </Button>
                <Button
                  variant={libraryFilter === "ads" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLibraryFilter("ads")}
                  className={libraryFilter === "ads" ? "bg-primary hover:bg-primary-hover text-white" : ""}
                >
                  Ads
                </Button>
                <Button
                  variant={libraryFilter === "images" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLibraryFilter("images")}
                  className={libraryFilter === "images" ? "bg-primary hover:bg-primary-hover text-white" : ""}
                >
                  Images
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAssets ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading assets...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {assets.length === 0
                    ? "No assets found. Create your first asset!"
                    : `No ${libraryFilter === "ads" ? "ads" : "images"} found.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Preview</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Format</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created By</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr key={asset.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
                          {(asset.type === "image" || asset.type === "reddit_ad") && asset.file_url ? (
                            <img
                              src={asset.file_url}
                              alt={asset.name}
                              className="w-16 h-16 object-cover rounded border border-border"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded border border-border flex items-center justify-center">
                              {asset.type === "image" && <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                              {asset.type === "video" && <Video className="h-6 w-6 text-muted-foreground" />}
                              {asset.type === "text" && <FileText className="h-6 w-6 text-muted-foreground" />}
                              {asset.type === "reddit_ad" && <MessageSquare className="h-6 w-6 text-[#FF4500]" />}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {asset.type === "image" && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                            {asset.type === "video" && <Video className="h-4 w-4 text-muted-foreground" />}
                            {asset.type === "text" && <FileText className="h-4 w-4 text-muted-foreground" />}
                            {asset.type === "reddit_ad" && <MessageSquare className="h-4 w-4 text-[#FF4500]" />}
                            <span className="text-sm capitalize">{asset.type === "reddit_ad" ? "Reddit Ad" : asset.type}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium">{asset.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {asset.ad_format ? asset.ad_format.toUpperCase() : asset.format || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              asset.status === "approved"
                                ? "bg-green-500/10 text-green-500"
                                : asset.status === "draft"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {asset.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {new Date(asset.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-muted-foreground font-mono">
                            {asset.user_id ? `${asset.user_id.substring(0, 8)}...` : "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {asset.file_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(asset.file_url, "_blank")}
                            >
                              View
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
