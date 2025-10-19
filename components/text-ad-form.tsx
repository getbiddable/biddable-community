"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus } from "lucide-react"
import {
  AdFormat,
  TextAdData,
  getCharacterLimit,
  getMaxItems,
  validateTextAd,
} from "@/lib/text-ads"

interface TextAdFormProps {
  onSubmit: (data: TextAdData, format: AdFormat, name: string) => void
  onPreview?: (data: TextAdData, format: AdFormat) => void
}

export function TextAdForm({ onSubmit, onPreview }: TextAdFormProps) {
  const [adFormat, setAdFormat] = useState<AdFormat>("rsa")
  const [assetName, setAssetName] = useState("")
  const [headlines, setHeadlines] = useState<string[]>([""])
  const [descriptions, setDescriptions] = useState<string[]>([""])
  const [paths, setPaths] = useState<string[]>(["", ""])
  const [finalUrl, setFinalUrl] = useState("")
  const [errors, setErrors] = useState<string[]>([])

  const headlineLimit = getCharacterLimit(adFormat, "headline")
  const descriptionLimit = getCharacterLimit(adFormat, "description")
  const pathLimit = getCharacterLimit(adFormat, "path")
  const maxHeadlines = getMaxItems(adFormat, "headline")
  const maxDescriptions = getMaxItems(adFormat, "description")

  const handleAddHeadline = () => {
    if (headlines.length < maxHeadlines) {
      setHeadlines([...headlines, ""])
    }
  }

  const handleRemoveHeadline = (index: number) => {
    if (headlines.length > 1) {
      setHeadlines(headlines.filter((_, i) => i !== index))
    }
  }

  const handleUpdateHeadline = (index: number, value: string) => {
    const newHeadlines = [...headlines]
    newHeadlines[index] = value
    setHeadlines(newHeadlines)
  }

  const handleAddDescription = () => {
    if (descriptions.length < maxDescriptions) {
      setDescriptions([...descriptions, ""])
    }
  }

  const handleRemoveDescription = (index: number) => {
    if (descriptions.length > 1) {
      setDescriptions(descriptions.filter((_, i) => i !== index))
    }
  }

  const handleUpdateDescription = (index: number, value: string) => {
    const newDescriptions = [...descriptions]
    newDescriptions[index] = value
    setDescriptions(newDescriptions)
  }

  const handleUpdatePath = (index: number, value: string) => {
    const newPaths = [...paths]
    newPaths[index] = value
    setPaths(newPaths)
  }

  const handleSubmit = () => {
    const adData: TextAdData = {
      headlines: headlines.filter((h) => h.trim() !== ""),
      descriptions: descriptions.filter((d) => d.trim() !== ""),
      paths: paths.filter((p) => p.trim() !== ""),
      final_url: finalUrl.trim() || undefined,
    }

    const validation = validateTextAd(adData, adFormat)

    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    if (!assetName.trim()) {
      setErrors(["Asset name is required"])
      return
    }

    setErrors([])
    onSubmit(adData, adFormat, assetName)
  }

  const handlePreview = () => {
    const adData: TextAdData = {
      headlines: headlines.filter((h) => h.trim() !== ""),
      descriptions: descriptions.filter((d) => d.trim() !== ""),
      paths: paths.filter((p) => p.trim() !== ""),
      final_url: finalUrl.trim() || undefined,
    }
    onPreview?.(adData, adFormat)
  }

  const getCharacterCountColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100
    if (percentage > 100) return "text-red-500"
    if (percentage > 80) return "text-yellow-500"
    return "text-muted-foreground"
  }

  return (
    <div className="space-y-6">
      {/* Asset Name */}
      <div>
        <Label htmlFor="asset-name" className="text-foreground">
          Asset Name
        </Label>
        <Input
          id="asset-name"
          placeholder="e.g., Summer Sale Search Ad"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
          className="mt-1 bg-background border-border text-foreground"
        />
      </div>

      {/* Ad Format Selection */}
      <div>
        <Label className="text-foreground">Ad Format</Label>
        <Select value={adFormat} onValueChange={(value) => setAdFormat(value as AdFormat)}>
          <SelectTrigger className="mt-1 bg-background border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rsa">Responsive Search Ad (RSA)</SelectItem>
            <SelectItem value="eta">Expanded Text Ad (ETA)</SelectItem>
            <SelectItem value="generic">Generic Text</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {adFormat === "rsa" && "Up to 15 headlines, 4 descriptions"}
          {adFormat === "eta" && "Up to 3 headlines, 2 descriptions"}
          {adFormat === "generic" && "No character limits"}
        </p>
      </div>

      {/* Headlines */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-foreground">Headlines</Label>
          {headlines.length < maxHeadlines && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddHeadline}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Headline
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {headlines.map((headline, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={`Headline ${index + 1}`}
                    value={headline}
                    onChange={(e) => handleUpdateHeadline(index, e.target.value)}
                    maxLength={adFormat === "generic" ? undefined : headlineLimit}
                    className="bg-background border-border text-foreground"
                  />
                  {headlines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveHeadline(index)}
                      className="h-10 w-10 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {adFormat !== "generic" && (
                  <p
                    className={`text-xs mt-1 ${getCharacterCountColor(
                      headline.length,
                      headlineLimit
                    )}`}
                  >
                    {headline.length} / {headlineLimit} characters
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Descriptions */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-foreground">Descriptions</Label>
          {descriptions.length < maxDescriptions && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDescription}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Description
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {descriptions.map((description, index) => (
            <div key={index}>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Textarea
                    placeholder={`Description ${index + 1}`}
                    value={description}
                    onChange={(e) => handleUpdateDescription(index, e.target.value)}
                    maxLength={adFormat === "generic" ? undefined : descriptionLimit}
                    className="bg-background border-border text-foreground min-h-20"
                  />
                  {adFormat !== "generic" && (
                    <p
                      className={`text-xs mt-1 ${getCharacterCountColor(
                        description.length,
                        descriptionLimit
                      )}`}
                    >
                      {description.length} / {descriptionLimit} characters
                    </p>
                  )}
                </div>
                {descriptions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDescription(index)}
                    className="h-10 w-10 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Display Paths (Optional) */}
      {adFormat !== "generic" && (
        <div>
          <Label className="text-foreground">Display Paths (Optional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Appears in the display URL: example.com/path1/path2
          </p>
          <div className="space-y-2">
            {paths.map((path, index) => (
              <div key={index}>
                <Input
                  placeholder={`Path ${index + 1}`}
                  value={path}
                  onChange={(e) => handleUpdatePath(index, e.target.value)}
                  maxLength={pathLimit}
                  className="bg-background border-border text-foreground"
                />
                <p className={`text-xs mt-1 ${getCharacterCountColor(path.length, pathLimit)}`}>
                  {path.length} / {pathLimit} characters
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final URL */}
      <div>
        <Label htmlFor="final-url" className="text-foreground">
          Final URL (Optional)
        </Label>
        <Input
          id="final-url"
          type="url"
          placeholder="https://example.com/landing-page"
          value={finalUrl}
          onChange={(e) => setFinalUrl(e.target.value)}
          className="mt-1 bg-background border-border text-foreground"
        />
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500 rounded p-3">
          <p className="text-sm font-medium text-red-500 mb-1">Validation Errors:</p>
          <ul className="list-disc list-inside text-sm text-red-500">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleSubmit}
          className="bg-primary hover:bg-primary-hover text-white flex-1"
        >
          Create Asset
        </Button>
        <Button type="button" variant="outline" onClick={handlePreview}>
          Preview
        </Button>
      </div>
    </div>
  )
}
