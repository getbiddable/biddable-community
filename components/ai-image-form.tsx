"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, CheckCircle2, Download, Clock } from "lucide-react"

interface AIImageFormProps {
  onSuccess?: () => void
}

interface AIRequest {
  requestId: string
  status: "pending" | "processing" | "completed" | "failed"
  publicUrl?: string
  storageKey?: string
  errorMessage?: string
  product: string
  brand: string
}

export function AIImageForm({ onSuccess }: AIImageFormProps) {
  const [product, setProduct] = useState("")
  const [brand, setBrand] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiRequest, setAiRequest] = useState<AIRequest | null>(null)
  const [polling, setPolling] = useState(false)

  // Poll for status updates
  useEffect(() => {
    if (!aiRequest || aiRequest.status === "completed" || aiRequest.status === "failed") {
      setPolling(false)
      return
    }

    setPolling(true)
    console.log("Starting polling for request:", aiRequest.requestId)

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai-status/${aiRequest.requestId}`)
        if (response.ok) {
          const data = await response.json()
          console.log("Poll response:", data)

          setAiRequest({
            requestId: data.requestId,
            status: data.status,
            product: data.product,
            brand: data.brand,
            publicUrl: data.publicUrl,
            storageKey: data.storageKey,
            errorMessage: data.errorMessage,
          })

          if (data.status === "completed") {
            setPolling(false)
            console.log("Image generation completed!")
            if (onSuccess) {
              onSuccess()
            }
          } else if (data.status === "failed") {
            setPolling(false)
            setError(data.errorMessage || "Image generation failed")
          }
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }, 3000) // Poll every 3 seconds

    return () => {
      console.log("Stopping polling for request:", aiRequest.requestId)
      clearInterval(pollInterval)
    }
  }, [aiRequest?.requestId, aiRequest?.status, onSuccess])

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
      }

      console.log("Submitting AI generation request:", payload)

      const response = await fetch("/api/ai-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`)
      }

      console.log("Request accepted:", data)

      // Start polling for status
      setAiRequest({
        requestId: data.requestId,
        status: data.status,
        product,
        brand,
      })
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
    setAiRequest(null)
    setError(null)
    setPolling(false)
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

      {!aiRequest ? (
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
                <span>Submitting...</span>
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
          {aiRequest.status === "pending" || aiRequest.status === "processing" ? (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 text-center">
              <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
              <h3 className="font-semibold text-foreground mb-2">
                {aiRequest.status === "pending" ? "Request Submitted" : "Generating Your Image"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Our AI is creating a custom image for <strong>{aiRequest.product}</strong> by{" "}
                <strong>{aiRequest.brand}</strong>. This typically takes 30-60 seconds.
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <span className="animate-spin">⚙️</span>
                <span>Processing{polling ? "..." : ""}</span>
              </div>
            </div>
          ) : aiRequest.status === "completed" ? (
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

              {aiRequest.publicUrl && (
                <>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <img
                      src={aiRequest.publicUrl}
                      alt={`${aiRequest.product} - ${aiRequest.brand}`}
                      className="w-full h-auto"
                    />
                  </div>

                  <div className="bg-background border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Product:</strong> {aiRequest.product} |{" "}
                      <strong className="text-foreground">Brand:</strong> {aiRequest.brand}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(aiRequest.publicUrl, "_blank")}
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
            </>
          ) : (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-semibold mb-2">Generation Failed</p>
              <p className="text-sm text-destructive">
                {aiRequest.errorMessage || "Image generation failed. Please try again."}
              </p>
              <Button type="button" variant="outline" className="mt-4 w-full" onClick={handleReset}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
