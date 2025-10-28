"use client"

import React, { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, X, ImageIcon, Video, HelpCircle } from "lucide-react"

interface RedditAdFormProps {
  onSuccess?: () => void
  onPreview?: (data: RedditAdPreviewData) => void
}

export interface RedditAdPreviewData {
  headline: string
  callToAction: string
  destinationUrl: string
  displayUrl?: string
  imagePreview?: string | null
}

interface RedditAdData {
  headline: string
  callToAction: string
  destinationUrl: string
  displayUrl?: string
  addSourceParameter: boolean
  allowComments: boolean
  mediaUrl?: string
  mediaType: "image" | "video" | null
}

export function RedditAdForm({ onSuccess, onPreview }: RedditAdFormProps) {
  const [name, setName] = useState("")
  const [headline, setHeadline] = useState("")
  const [callToAction, setCallToAction] = useState("")
  const [destinationUrl, setDestinationUrl] = useState("https://")
  const [displayUrl, setDisplayUrl] = useState("")
  const [addSourceParameter, setAddSourceParameter] = useState(false)
  const [allowComments, setAllowComments] = useState(false)
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Use effect to update preview on changes
  React.useEffect(() => {
    if (onPreview) {
      onPreview({
        headline,
        callToAction,
        destinationUrl,
        displayUrl,
        imagePreview: preview,
      })
    }
  }, [headline, callToAction, destinationUrl, displayUrl, preview, onPreview])

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null)
      setPreview(null)
      setMediaType(null)
      return
    }

    // Validate file type
    const isImage = selectedFile.type.startsWith("image/")
    const isVideo = selectedFile.type.startsWith("video/")

    if (!isImage && !isVideo) {
      alert("Please select an image or video file")
      return
    }

    setFile(selectedFile)
    setMediaType(isImage ? "image" : "video")

    // Create preview for images
    if (isImage) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }, [])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !headline || !callToAction || !destinationUrl || destinationUrl === "https://") {
      alert("Please fill in all required fields")
      return
    }

    if (headline.length > 300) {
      alert("Headline must be 300 characters or less")
      return
    }

    if (!file && !preview) {
      alert("Please upload an image/video or import from URL")
      return
    }

    setSubmitting(true)

    try {
      let fileUrl = preview

      // If file was uploaded, upload it first
      if (file) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("name", `${name}-media`)
        formData.append("format", file.name.split(".").pop()?.toUpperCase() || "IMAGE")

        const uploadResponse = await fetch("/api/assets/upload-image", {
          method: "POST",
          body: formData,
        })

        const uploadResult = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || "Upload failed")
        }

        fileUrl = uploadResult.fileUrl
      }

      // Create the Reddit ad asset
      const adData: RedditAdData = {
        headline,
        callToAction,
        destinationUrl,
        displayUrl: displayUrl || undefined,
        addSourceParameter,
        allowComments,
        mediaUrl: fileUrl || undefined,
        mediaType,
      }

      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type: "reddit_ad",
          ad_format: "reddit_promoted_post",
          ad_data: adData,
          format: "REDDIT",
          size: `${headline.length} chars`,
          file_url: fileUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create Reddit ad")
      }

      alert(`Reddit ad "${name}" created successfully!`)

      // Reset form
      setName("")
      setHeadline("")
      setCallToAction("")
      setDestinationUrl("https://")
      setDisplayUrl("")
      setAddSourceParameter(false)
      setAllowComments(false)
      setFile(null)
      setPreview(null)
      setMediaType(null)

      // Call success callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error creating Reddit ad:", error)
      alert(error instanceof Error ? error.message : "Failed to create Reddit ad")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="reddit-name">Asset Name *</Label>
        <Input
          id="reddit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter asset name"
          className="mt-1"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Label>Images or video *</Label>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          You can also select an existing post from your{" "}
          <span className="text-primary">post library</span>
        </p>

        {/* Drag and drop area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          {preview ? (
            <div className="space-y-4">
              <div className="relative inline-block">
                {mediaType === "image" ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-48 rounded-lg border border-border"
                  />
                ) : (
                  <div className="flex items-center justify-center w-48 h-48 bg-muted rounded-lg border border-border">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                    setMediaType(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{file?.name}</p>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop or <span className="text-primary">browse files</span>
              </p>
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="reddit-file-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("reddit-file-upload")?.click()}
              >
                Choose File
              </Button>
            </>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Label htmlFor="reddit-headline">Headline *</Label>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">{headline.length}/300</span>
        </div>
        <Textarea
          id="reddit-headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Write a compelling headline"
          className="mt-1 min-h-[100px]"
          maxLength={300}
          required
        />
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-1">
          <Label htmlFor="reddit-cta">Call to Action</Label>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        <Select value={callToAction} onValueChange={setCallToAction} required>
          <SelectTrigger id="reddit-cta" className="mt-1">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="download">Download</SelectItem>
            <SelectItem value="install">Install</SelectItem>
            <SelectItem value="shop_now">Shop Now</SelectItem>
            <SelectItem value="view_more">View More</SelectItem>
            <SelectItem value="sign_up">Sign Up</SelectItem>
            <SelectItem value="learn_more">Learn More</SelectItem>
            <SelectItem value="contact_us">Contact Us</SelectItem>
            <SelectItem value="get_showtimes">Get Showtimes</SelectItem>
            <SelectItem value="get_quote">Get a Quote</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Label htmlFor="reddit-dest-url">Destination URL *</Label>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button type="button" variant="ghost" size="sm" className="text-sm">
            <span className="text-muted-foreground">Preview</span>
          </Button>
        </div>
        <Input
          id="reddit-dest-url"
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder="https://"
          className="mt-1"
          required
        />
      </div>

      <div>
        <Button
          type="button"
          variant="link"
          className="text-primary p-0 h-auto"
          onClick={() => {
            // Toggle display URL input
            const displayUrlContainer = document.getElementById("display-url-container")
            if (displayUrlContainer) {
              displayUrlContainer.style.display = displayUrlContainer.style.display === "none" ? "block" : "none"
            }
          }}
        >
          Edit Display URL
        </Button>
        <div id="display-url-container" style={{ display: "none" }} className="mt-2">
          <Input
            value={displayUrl}
            onChange={(e) => setDisplayUrl(e.target.value)}
            placeholder="Enter display URL"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="reddit-source-param"
          checked={addSourceParameter}
          onCheckedChange={(checked) => setAddSourceParameter(checked as boolean)}
        />
        <Label htmlFor="reddit-source-param" className="flex items-center space-x-2 cursor-pointer">
          <span>Add source parameter</span>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="reddit-allow-comments"
          checked={allowComments}
          onCheckedChange={(checked) => setAllowComments(checked as boolean)}
        />
        <Label htmlFor="reddit-allow-comments" className="flex items-center space-x-2 cursor-pointer">
          <span>Allow comments</span>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Creating Reddit Ad..." : "Create Reddit Ad"}
      </Button>
    </form>
  )
}
