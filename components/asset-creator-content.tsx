"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, ImageIcon, Video, FileText, Palette, Eye } from "lucide-react"

interface AdAsset {
  id: string
  name: string
  type: "image" | "video" | "text"
  format: string
  size: string
  status: "draft" | "approved" | "rejected"
  createdAt: string
}

const mockAssets: AdAsset[] = [
  {
    id: "1",
    name: "Summer Sale Banner",
    type: "image",
    format: "JPG",
    size: "1200x628",
    status: "approved",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Product Demo Video",
    type: "video",
    format: "MP4",
    size: "1920x1080",
    status: "draft",
    createdAt: "2024-01-14",
  },
  {
    id: "3",
    name: "Brand Story Copy",
    type: "text",
    format: "TXT",
    size: "250 chars",
    status: "approved",
    createdAt: "2024-01-13",
  },
]

export function AssetCreatorContent() {
  const [assets] = useState<AdAsset[]>(mockAssets)
  const [activeTab, setActiveTab] = useState<"create" | "library">("create")
  const [assetType, setAssetType] = useState<"image" | "video" | "text">("image")

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Asset Creator</h1>
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
                <Label htmlFor="asset-name" className="text-foreground">
                  Asset Name
                </Label>
                <Input
                  id="asset-name"
                  placeholder="Enter asset name"
                  className="mt-1 bg-background border-border text-foreground"
                />
              </div>

              <div>
                <Label className="text-foreground">Asset Type</Label>
                <div className="flex space-x-2 mt-2">
                  {(["image", "video", "text"] as const).map((type) => (
                    <Button
                      key={type}
                      variant={assetType === type ? "default" : "outline"}
                      onClick={() => setAssetType(type)}
                      className={`flex items-center space-x-2 ${
                        assetType === type ? "bg-primary hover:bg-primary-hover text-white" : ""
                      }`}
                    >
                      {type === "image" && <ImageIcon className="h-4 w-4" />}
                      {type === "video" && <Video className="h-4 w-4" />}
                      {type === "text" && <FileText className="h-4 w-4" />}
                      <span className="capitalize">{type}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {assetType === "image" && (
                <>
                  <div>
                    <Label className="text-foreground">Image Format</Label>
                    <Select>
                      <SelectTrigger className="mt-1 bg-background border-border text-foreground">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">Square (1080x1080)</SelectItem>
                        <SelectItem value="landscape">Landscape (1200x628)</SelectItem>
                        <SelectItem value="portrait">Portrait (1080x1350)</SelectItem>
                        <SelectItem value="story">Story (1080x1920)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border-2 border-dashed border-border p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">Drop your image here or click to upload</p>
                    <Button variant="outline">Choose File</Button>
                  </div>
                </>
              )}

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
                <>
                  <div>
                    <Label htmlFor="ad-copy" className="text-foreground">
                      Ad Copy
                    </Label>
                    <Textarea
                      id="ad-copy"
                      placeholder="Write your ad copy here..."
                      className="mt-1 bg-background border-border text-foreground min-h-32"
                    />
                  </div>
                  <div>
                    <Label htmlFor="headline" className="text-foreground">
                      Headline
                    </Label>
                    <Input
                      id="headline"
                      placeholder="Enter compelling headline"
                      className="mt-1 bg-background border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cta" className="text-foreground">
                      Call to Action
                    </Label>
                    <Input
                      id="cta"
                      placeholder="e.g., Shop Now, Learn More"
                      className="mt-1 bg-background border-border text-foreground"
                    />
                  </div>
                </>
              )}

              <div className="flex space-x-2">
                <Button className="bg-primary hover:bg-primary-hover text-white flex-1">Create Asset</Button>
                <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                  <Eye className="h-4 w-4" />
                  <span>Preview</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
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
                    {assetType === "text" && <FileText className="mx-auto h-16 w-16" />}
                  </div>
                  <p>Asset preview will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "library" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Asset Library</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map((asset) => (
                <Card key={asset.id} className="bg-background border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {asset.type === "image" && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                        {asset.type === "video" && <Video className="h-4 w-4 text-muted-foreground" />}
                        {asset.type === "text" && <FileText className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-medium text-foreground">{asset.name}</span>
                      </div>
                      <div
                        className={`px-2 py-1 text-xs font-medium ${
                          asset.status === "approved"
                            ? "bg-primary text-white"
                            : asset.status === "draft"
                              ? "bg-yellow-500 text-black"
                              : "bg-red-500 text-white"
                        }`}
                      >
                        {asset.status}
                      </div>
                    </div>
                    <div className="bg-muted h-32 mb-3 flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">
                        {asset.format} • {asset.size}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Created: {asset.createdAt}</span>
                      <Button variant="outline" size="sm">
                        Use Asset
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
