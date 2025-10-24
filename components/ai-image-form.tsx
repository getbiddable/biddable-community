"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, CheckCircle2, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface AIImageFormProps {
  onSuccess?: () => void
}

interface GeneratedImage {
  filename: string
  storageId: string
  publicUrl?: string
}

export function AIImageForm({ onSuccess }: AIImageFormProps) {
  const [product, setProduct] = useState("")
  const [brand, setBrand] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!product || !brand) {
      setError("Please fill in both Product and Brand fields")
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        Product: product,
        "Your Brand": brand,
        Images: null,
        submittedAt: new Date().toISOString(),
        formMode: "test"
      }

      const response = await fetch("/api/ai-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Webhook returned status ${response.status}`)
      }

      // Parse the response from n8n
      let responseData
      try {
        const responseText = await response.text()
        console.log("n8n response (raw):", responseText)
        responseData = responseText ? JSON.parse(responseText) : null
      } catch (parseError) {
        console.error("Failed to parse response:", parseError)
        responseData = null
      }

      console.log("n8n response (parsed):", responseData)

      // Expected format: [{ "Key": "biddable-images/2025-10-24T03:29:10.288Z", "Id": "485f73db-8cac-4061-bce6-cf9019254908" }]
      if (responseData && Array.isArray(responseData) && responseData.length > 0 && responseData[0].Key && responseData[0].Id) {
        setLoadingImage(true)

        const imageData = responseData[0]
        // Extract bucket and filename from Key (format: "bucket/filename")
        const keyParts = imageData.Key.split('/')
        const bucketName = keyParts[0] // "biddable-images"
        const filename = keyParts.slice(1).join('/') // Everything after first slash

        console.log("Extracted - Bucket:", bucketName, "Filename:", filename, "ID:", imageData.Id)

        // Fetch the image from Supabase Storage
        const supabase = createClient()

        // Get public URL using the filename as the storage path
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filename)

        console.log("Public URL:", publicUrl)

        setGeneratedImage({
          filename: filename,
          storageId: imageData.Id,
          publicUrl: publicUrl,
        })

        setLoadingImage(false)

        // Call success callback
        if (onSuccess) {
          onSuccess()
        }
      } else {
        // If no valid response, show error message
        console.warn("No valid image data in response. Response:", responseData)
        setError("Image generation request sent, but no image data was returned. This may be a networking issue. Check the browser console for details.")
      }

      // Don't reset form immediately so user can see the result
      // setProduct("")
      // setBrand("")
    } catch (err) {
      console.error("Submission error:", err)
      setError(err instanceof Error ? err.message : "Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setProduct("")
    setBrand("")
    setGeneratedImage(null)
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 text-primary mb-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">AI-Powered Image Generation</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Tell us about your product and brand, and our AI will generate custom images for your campaigns.
        </p>
      </div>

      {!generatedImage ? (
        <>
          <div>
            <Label htmlFor="product">Product</Label>
            <Input
              id="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g., Running Shoes, Coffee Maker, CRM Software"
              className="mt-1"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              What product or service are you advertising?
            </p>
          </div>

          <div>
            <Label htmlFor="brand">Your Brand</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g., Nike, Starbucks, Salesforce"
              className="mt-1"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              What's your brand or company name?
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover"
            disabled={submitting || !product || !brand}
          >
            {submitting ? (
              <span className="flex items-center space-x-2">
                <span className="animate-spin">⚙️</span>
                <span>Generating...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Generate AI Images</span>
              </span>
            )}
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          {loadingImage ? (
            <div className="bg-background border border-border rounded-lg p-8 text-center">
              <div className="animate-spin text-4xl mb-4">⚙️</div>
              <p className="text-muted-foreground">Loading generated image...</p>
            </div>
          ) : (
            <>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-green-500 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Image Generated Successfully!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your AI-generated image is ready and has been added to your asset library.
                </p>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <img
                  src={generatedImage.publicUrl}
                  alt={generatedImage.filename}
                  className="w-full h-auto"
                />
              </div>

              <div className="bg-background border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  <strong className="text-foreground">Filename:</strong> {generatedImage.filename}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Product:</strong> {product} | <strong className="text-foreground">Brand:</strong> {brand}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(generatedImage.publicUrl, "_blank")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Image
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-primary hover:bg-primary-hover"
                  onClick={handleReset}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Another
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </form>
  )
}
