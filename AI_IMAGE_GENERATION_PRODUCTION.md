# AI Image Generation - Production Architecture Implementation Guide

## Overview

This document outlines the steps to migrate the AI image generation feature from a synchronous (blocking) implementation to an asynchronous (webhook callback) architecture suitable for production deployment.

## Current State (Synchronous)

```
User → Frontend → /api/ai-generate → n8n webhook → waits... → response → display image
```

**Problems:**
- Blocks for 30+ seconds while AI generates image
- Timeout issues on serverless platforms (60s limit)
- Poor user experience (user stares at loading spinner)
- No error recovery if connection drops

## Target State (Asynchronous)

```
1. User → Frontend → /api/ai-generate → Create DB record → Return immediately
2. n8n processes in background (30-60s)
3. n8n → /api/ai-callback → Update DB record
4. Frontend polls or uses WebSocket → Receives update → Display image
```

**Benefits:**
- Immediate response to user
- No timeout issues
- Better error handling
- Cost tracking and rate limiting
- Scalable for multiple concurrent requests

---

## Implementation Steps

### Phase 1: Database Schema Setup

#### 1.1 Create `ai_image_requests` table

```sql
CREATE TABLE ai_image_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Request data
  product TEXT NOT NULL,
  brand TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'

  -- Result data (populated by callback)
  storage_key TEXT,
  storage_id TEXT,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  n8n_execution_id TEXT,
  request_metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_ai_requests_user_id ON ai_image_requests(user_id);
CREATE INDEX idx_ai_requests_org_id ON ai_image_requests(organization_id);
CREATE INDEX idx_ai_requests_status ON ai_image_requests(status);
CREATE INDEX idx_ai_requests_created_at ON ai_image_requests(created_at DESC);

-- RLS Policies
ALTER TABLE ai_image_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI requests" ON ai_image_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create AI requests" ON ai_image_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Service role can update (for callback)
CREATE POLICY "Service can update AI requests" ON ai_image_requests
  FOR UPDATE USING (true);
```

#### 1.2 Create migration file

Create: `supabase/migrations/create_ai_image_requests_table.sql` with the above SQL.

---

### Phase 2: Environment Variables

Add to `.env.local` and production environment:

```env
# AI Generation
N8N_WEBHOOK_URL=https://biddable.app.n8n.cloud/webhook-test/7cca0f58-831a-46af-ab24-fbc86b01bbfc
N8N_WEBHOOK_SECRET=your-secret-token-here-generate-a-random-string
AI_CALLBACK_SECRET=another-secret-token-for-callback-verification

# Rate Limiting (optional)
AI_GENERATION_RATE_LIMIT_PER_HOUR=10
```

**Important:** Generate secure random tokens:
```bash
# Generate secrets
openssl rand -base64 32
```

---

### Phase 3: API Routes

#### 3.1 Create `/api/ai-generate/route.ts` (Async Version)

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's organization
    const { data: orgData, error: orgError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (orgError || !orgData) {
      return NextResponse.json({ error: "No organization found for user" }, { status: 400 })
    }

    const organizationId = orgData.organization_id

    // Parse request body
    const { Product, "Your Brand": brand } = await request.json()

    if (!Product || !brand) {
      return NextResponse.json({ error: "Product and Brand are required" }, { status: 400 })
    }

    // Rate limiting check (optional but recommended)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from("ai_image_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo)

    const rateLimit = parseInt(process.env.AI_GENERATION_RATE_LIMIT_PER_HOUR || "10", 10)
    if (count !== null && count >= rateLimit) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Maximum ${rateLimit} requests per hour.` },
        { status: 429 }
      )
    }

    // Create database record
    const { data: aiRequest, error: insertError } = await supabase
      .from("ai_image_requests")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        product: Product,
        brand: brand,
        status: "pending",
      })
      .select()
      .single()

    if (insertError || !aiRequest) {
      console.error("Failed to create AI request record:", insertError)
      return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
    }

    // Prepare payload for n8n
    const n8nPayload = {
      requestId: aiRequest.id,
      Product: Product,
      "Your Brand": brand,
      organizationId: organizationId,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai-callback`,
      callbackSecret: process.env.AI_CALLBACK_SECRET,
      submittedAt: new Date().toISOString(),
      formMode: process.env.NODE_ENV === "production" ? "production" : "test",
    }

    // Send to n8n (fire and forget - don't await)
    fetch(process.env.N8N_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
      },
      body: JSON.stringify(n8nPayload),
    })
      .then(async (response) => {
        if (!response.ok) {
          console.error("n8n webhook error:", response.status, await response.text())
          // Update status to failed
          await supabase
            .from("ai_image_requests")
            .update({
              status: "failed",
              error_message: `n8n webhook returned ${response.status}`,
              updated_at: new Date().toISOString()
            })
            .eq("id", aiRequest.id)
        } else {
          // Update status to processing
          await supabase
            .from("ai_image_requests")
            .update({
              status: "processing",
              updated_at: new Date().toISOString()
            })
            .eq("id", aiRequest.id)
        }
      })
      .catch(async (error) => {
        console.error("n8n webhook error:", error)
        await supabase
          .from("ai_image_requests")
          .update({
            status: "failed",
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq("id", aiRequest.id)
      })

    // Return immediately with request ID
    return NextResponse.json(
      {
        requestId: aiRequest.id,
        status: "pending",
        message: "AI image generation started. This may take 30-60 seconds.",
      },
      { status: 202 } // 202 Accepted
    )
  } catch (error) {
    console.error("Error in /api/ai-generate:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
```

#### 3.2 Create `/api/ai-callback/route.ts`

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const providedSecret = request.headers.get("X-Callback-Secret")
    const expectedSecret = process.env.AI_CALLBACK_SECRET

    if (!providedSecret || providedSecret !== expectedSecret) {
      console.error("Invalid callback secret")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("AI callback received:", body)

    const { requestId, status, Key, Id, error } = body

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (status === "completed" && Key && Id) {
      updateData.status = "completed"
      updateData.storage_key = Key
      updateData.storage_id = Id
      updateData.completed_at = new Date().toISOString()

      // Also create an asset record for the user
      // First, get the request to get user_id and organization_id
      const { data: aiRequest } = await supabase
        .from("ai_image_requests")
        .select("user_id, organization_id, product, brand")
        .eq("id", requestId)
        .single()

      if (aiRequest) {
        // Extract bucket and filename from Key
        const keyParts = Key.split("/")
        const bucketName = keyParts[0]
        const filename = keyParts.slice(1).join("/")

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filename)

        // Create asset record
        await supabase.from("assets").insert({
          organization_id: aiRequest.organization_id,
          user_id: aiRequest.user_id,
          name: `AI Generated: ${aiRequest.product} - ${aiRequest.brand}`,
          type: "image",
          format: "PNG",
          file_url: publicUrl,
          status: "approved",
        })
      }
    } else if (status === "failed" || error) {
      updateData.status = "failed"
      updateData.error_message = error || "Unknown error"
      updateData.completed_at = new Date().toISOString()
    }

    // Update the request
    const { error: updateError } = await supabase
      .from("ai_image_requests")
      .update(updateData)
      .eq("id", requestId)

    if (updateError) {
      console.error("Failed to update AI request:", updateError)
      return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error in /api/ai-callback:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
```

#### 3.3 Create `/api/ai-status/[requestId]/route.ts` (Polling endpoint)

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = params

    // Get the request
    const { data: aiRequest, error: fetchError } = await supabase
      .from("ai_image_requests")
      .select("*")
      .eq("id", requestId)
      .eq("user_id", user.id) // Ensure user owns this request
      .single()

    if (fetchError || !aiRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // If completed, include public URL
    let publicUrl = null
    if (aiRequest.status === "completed" && aiRequest.storage_key) {
      const keyParts = aiRequest.storage_key.split("/")
      const bucketName = keyParts[0]
      const filename = keyParts.slice(1).join("/")

      const { data: { publicUrl: url } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filename)

      publicUrl = url
    }

    return NextResponse.json({
      requestId: aiRequest.id,
      status: aiRequest.status,
      product: aiRequest.product,
      brand: aiRequest.brand,
      storageKey: aiRequest.storage_key,
      storageId: aiRequest.storage_id,
      publicUrl,
      errorMessage: aiRequest.error_message,
      createdAt: aiRequest.created_at,
      completedAt: aiRequest.completed_at,
    })
  } catch (error) {
    console.error("Error in /api/ai-status:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}
```

---

### Phase 4: Update Frontend Component

#### 4.1 Update `components/ai-image-form.tsx`

Add polling logic:

```typescript
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
  product?: string
  brand?: string
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
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai-status/${aiRequest.requestId}`)
        if (response.ok) {
          const data = await response.json()
          setAiRequest(data)

          if (data.status === "completed") {
            setPolling(false)
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

    return () => clearInterval(pollInterval)
  }, [aiRequest, onSuccess])

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
                <span>Processing...</span>
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
              <p className="text-sm text-destructive">
                <strong>Error:</strong> {aiRequest.errorMessage || "Image generation failed"}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full"
                onClick={handleReset}
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
```

---

### Phase 5: Configure n8n Workflow

Your n8n workflow needs to be updated to:

1. **Accept the new payload format** with `requestId` and `callbackUrl`
2. **Make a callback** to your Next.js app when complete

#### Example n8n HTTP Request node configuration:

**When image generation is complete:**

```
URL: {{ $node["Webhook"].json["callbackUrl"] }}
Method: POST
Headers:
  Content-Type: application/json
  X-Callback-Secret: {{ $node["Webhook"].json["callbackSecret"] }}
Body (JSON):
{
  "requestId": "{{ $node["Webhook"].json["requestId"] }}",
  "status": "completed",
  "Key": "{{ $node["Upload to Supabase"].json["Key"] }}",
  "Id": "{{ $node["Upload to Supabase"].json["Id"] }}"
}
```

**On error:**

```
Body (JSON):
{
  "requestId": "{{ $node["Webhook"].json["requestId"] }}",
  "status": "failed",
  "error": "{{ $json["error"] }}"
}
```

---

### Phase 6: Testing Checklist

- [ ] Run database migration
- [ ] Set environment variables
- [ ] Test user can submit AI generation request
- [ ] Verify database record is created
- [ ] Confirm n8n receives request with correct payload
- [ ] Test n8n can callback to `/api/ai-callback`
- [ ] Verify frontend polls and updates status
- [ ] Test completed image displays correctly
- [ ] Test error handling (simulate n8n failure)
- [ ] Test rate limiting (make 11 requests in 1 hour)
- [ ] Verify asset is created in asset library
- [ ] Test with multiple concurrent requests

---

### Phase 7: Production Deployment

1. **Deploy Database Migration**
   ```bash
   # Via Supabase CLI or Dashboard SQL Editor
   ```

2. **Set Production Environment Variables** in Vercel/hosting platform

3. **Update n8n Webhook**
   - Change `callbackUrl` to production domain
   - Test callback can reach production API

4. **Monitor Logs**
   - Watch for any errors in callback endpoint
   - Monitor n8n execution logs

5. **Set Up Alerts** (optional but recommended)
   - Alert if requests stay in "processing" for > 5 minutes
   - Alert on callback failures

---

## Optional Enhancements

### Real-time Updates with WebSockets (Alternative to Polling)

Instead of polling every 3 seconds, use Supabase Realtime:

```typescript
// In ai-image-form.tsx
useEffect(() => {
  if (!aiRequest || !aiRequest.requestId) return

  const supabase = createClient()

  const channel = supabase
    .channel(`ai-request-${aiRequest.requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ai_image_requests',
        filter: `id=eq.${aiRequest.requestId}`,
      },
      (payload) => {
        console.log('Real-time update:', payload.new)
        setAiRequest(prev => ({ ...prev, ...payload.new }))
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [aiRequest?.requestId])
```

### Cost Tracking

Add a `credits` or `cost` column to track AI generation costs per user/org.

### Admin Dashboard

Create an admin view to see all AI requests, success rates, and average processing times.

---

## Rollback Plan

If issues arise in production:

1. Keep the old synchronous API route as `/api/ai-generate-sync`
2. Add a feature flag to switch between sync/async
3. Can quickly revert frontend to use old endpoint

---

## Support & Questions

For implementation questions, refer to:
- This document
- `/app/api/ai-generate/route.ts` (current sync implementation)
- Next.js API Routes docs: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Supabase Realtime docs: https://supabase.com/docs/guides/realtime

---

**Estimated Implementation Time:** 4-6 hours

**Priority:** High (required for production scalability)

**Last Updated:** 2025-10-24
