# AI Image Generation Implementation Plan

## Overview
Users provide a prompt to generate an AI image. We create a database record, trigger an n8n webhook, and poll for the completed image URL.

## Current State
- **Image section**: Basic upload placeholder with format selector (Square, Landscape, Portrait, Story)
- **No backend**: Upload button does nothing
- **No AI generation**: Need to add prompt input and trigger n8n workflow

## Workflow

### 1. User Flow
1. User selects "Image" asset type
2. User enters:
   - Asset name (e.g., "Summer Sale Banner")
   - Image format (Square, Landscape, Portrait, Story)
   - AI prompt (e.g., "A vibrant summer beach scene with sunglasses and beach balls")
3. User clicks "Generate Image"
4. **Status: "Saving to database..."**
5. Asset record created in `assets` table with status `generating`
6. **Status: "Triggering AI image generation..."**
7. n8n webhook called with asset ID and prompt
8. **Status: "AI is generating your image..."**
9. Frontend polls asset record every 2-3 seconds
10. When `file_url` appears in database, **Status: "Image ready!"**
11. Display the generated image

### 2. Database Schema (Already Exists)
```sql
-- assets table already has these fields:
id UUID
organization_id UUID
user_id UUID
name TEXT
type TEXT ('image')
format TEXT ('square', 'landscape', 'portrait', 'story')
dimensions TEXT ('1080x1080', '1200x628', etc.)
status TEXT ('generating', 'completed', 'failed')
file_url TEXT (null initially, populated by n8n)
file_path TEXT
created_at TIMESTAMP
updated_at TIMESTAMP

-- NEW: Add fields for AI generation
ai_prompt TEXT (the user's prompt)
generation_status TEXT ('pending', 'processing', 'completed', 'failed')
```

### 3. API Endpoints

#### POST `/api/assets/generate-image`
**Request:**
```json
{
  "name": "Summer Sale Banner",
  "format": "square",
  "dimensions": "1080x1080",
  "prompt": "A vibrant summer beach scene..."
}
```

**Process:**
1. Authenticate user
2. Get user's organization
3. Create asset record in database:
   ```json
   {
     "type": "image",
     "status": "draft",
     "generation_status": "pending",
     "ai_prompt": "...",
     "file_url": null
   }
   ```
4. Trigger n8n webhook:
   ```
   POST {N8N_WEBHOOK_URL}/generate-image
   {
     "asset_id": "uuid",
     "prompt": "...",
     "format": "square",
     "dimensions": "1080x1080"
   }
   ```
5. Update asset: `generation_status = 'processing'`
6. Return asset ID to frontend

**Response:**
```json
{
  "success": true,
  "asset_id": "uuid",
  "status": "processing"
}
```

#### GET `/api/assets/[id]`
**Purpose:** Poll for completion
**Response:**
```json
{
  "id": "uuid",
  "name": "Summer Sale Banner",
  "generation_status": "completed",
  "file_url": "https://storage.../image.png",
  "created_at": "..."
}
```

### 4. Frontend Components

#### New Component: `AIImageForm`
Replace the current upload UI with:

```tsx
// components/ai-image-form.tsx
- Asset name input
- Format selector (square/landscape/portrait/story)
- Prompt textarea (with character suggestions)
- Status indicator with progress messages
- Generate Image button
```

**Status Messages:**
- 🔄 "Saving to database..."
- 🔄 "Triggering AI image generation..."
- 🎨 "AI is generating your image... (this may take 30-60 seconds)"
- ✅ "Image generated successfully!"
- ❌ "Generation failed. Please try again."

#### Update `asset-creator-content.tsx`
- Import `AIImageForm`
- Add state for image generation status
- Implement polling logic (every 3 seconds, max 60 seconds)
- Show generated image in preview panel when complete

### 5. Environment Variables
```bash
# .env.local
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_WEBHOOK_SECRET=your-secret-key (optional for security)
```

### 6. n8n Webhook Contract

**What we send to n8n:**
```json
POST {N8N_WEBHOOK_URL}/generate-image
{
  "asset_id": "fd13905a-8db8-47f8-8fc8-a35b65ab58b5",
  "prompt": "A vibrant summer beach scene",
  "format": "square",
  "dimensions": "1080x1080"
}
```

**What n8n must do:**
1. Receive webhook
2. Generate image using AI service (DALL-E, Midjourney, etc.)
3. Upload image to storage (Supabase Storage, S3, etc.)
4. Update assets table:
   ```sql
   UPDATE assets
   SET
     file_url = 'https://storage.../image.png',
     file_path = 'images/asset-uuid.png',
     generation_status = 'completed',
     status = 'approved',
     updated_at = NOW()
   WHERE id = 'asset_id'
   ```

**On failure:**
```sql
UPDATE assets
SET
  generation_status = 'failed',
  updated_at = NOW()
WHERE id = 'asset_id'
```

### 7. Implementation Steps

1. ✅ Database already has `assets` table
2. ⬜ Add `ai_prompt` and `generation_status` columns to `assets` table
3. ⬜ Create `AIImageForm` component
4. ⬜ Create `/api/assets/generate-image` route
5. ⬜ Create `/api/assets/[id]` route (for polling)
6. ⬜ Update `asset-creator-content.tsx` to use `AIImageForm`
7. ⬜ Implement polling logic with status updates
8. ⬜ Add preview panel to show generated images
9. ⬜ Test with n8n webhook

### 8. Asset Library Integration

**Fetch assets in library tab:**
```tsx
// Fetch all assets for organization
const { data: assets } = await fetch('/api/assets')

// Filter by type
const imageAssets = assets.filter(a => a.type === 'image')

// Display in grid with:
- Thumbnail (from file_url)
- Name
- Status badge (generating/completed/failed)
- Format and dimensions
- Created date
```

### 9. Error Handling

**Scenarios:**
- n8n webhook fails to respond → Show error after 60 seconds
- Image generation fails → n8n updates status to 'failed'
- Network error during polling → Retry with exponential backoff
- User navigates away → Stop polling but generation continues

### 10. Future Enhancements
- WebSocket for real-time updates instead of polling
- Progress percentage from n8n
- Multiple image variations
- Edit/regenerate functionality
- Prompt suggestions/templates
- Image history and favorites

---

## Quick Reference

### Status Flow
```
pending → processing → completed
                    → failed
```

### Database Update (by n8n)
```sql
-- Success
UPDATE assets SET file_url = '...', generation_status = 'completed' WHERE id = '...'

-- Failure
UPDATE assets SET generation_status = 'failed' WHERE id = '...'
```

### Frontend Polling
```typescript
// Poll every 3 seconds, max 20 times (60 seconds)
const pollInterval = setInterval(async () => {
  const asset = await fetch(`/api/assets/${assetId}`)
  if (asset.generation_status === 'completed' || asset.generation_status === 'failed') {
    clearInterval(pollInterval)
    // Update UI
  }
}, 3000)
```
