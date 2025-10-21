"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, ImageIcon } from "lucide-react"

interface ImageUploadFormProps {
  onSuccess?: () => void
}

export function ImageUploadForm({ onSuccess }: ImageUploadFormProps) {
  const [name, setName] = useState("")
  const [format, setFormat] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null)
      setPreview(null)
      return
    }

    // Validate file type
    if (!selectedFile.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    setFile(selectedFile)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)

    // Auto-detect format if not set
    if (!format) {
      const ext = selectedFile.name.split(".").pop()?.toUpperCase()
      if (ext) {
        setFormat(ext)
      }
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

    if (!file || !name) {
      alert("Please provide both an asset name and select a file")
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", name)
      formData.append("format", format || file.name.split(".").pop()?.toUpperCase() || "IMAGE")

      const response = await fetch("/api/assets/upload-image", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Upload failed")
      }

      alert(`Image "${name}" uploaded successfully!`)

      // Reset form
      setName("")
      setFormat("")
      setFile(null)
      setPreview(null)

      // Call success callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert(error instanceof Error ? error.message : "Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="image-name">Asset Name</Label>
        <Input
          id="image-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter asset name"
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="image-format">Image Format</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger id="image-format" className="mt-1">
            <SelectValue placeholder="Select format (auto-detected)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="JPG">JPG</SelectItem>
            <SelectItem value="PNG">PNG</SelectItem>
            <SelectItem value="WEBP">WebP</SelectItem>
            <SelectItem value="GIF">GIF</SelectItem>
            <SelectItem value="SVG">SVG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Upload Image</Label>
        <div
          className={`mt-1 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-64 rounded-lg border border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleFileChange(null)}
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
                Drop your image here or click to upload
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                Choose File
              </Button>
            </>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={uploading || !file || !name}>
        {uploading ? "Uploading..." : "Upload Image"}
      </Button>
    </form>
  )
}
