# Image Upload Implementation

## Overview
Image upload functionality has been integrated into the Creative section. Images are uploaded to Supabase Storage and asset records are saved to the database with public URLs.

## Setup Required

### 1. Create Supabase Storage Bucket
In your Supabase Dashboard:
1. Go to **Storage** → **New bucket**
2. Create a bucket named: `assets`
3. Make it **public** (so images have public URLs)
4. Enable RLS policies (optional but recommended)

### 2. Update Environment Variables
Add to your `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=assets
```

### 3. Database Schema
Ensure the `assets` table has a `file_url` column:
```sql
ALTER TABLE assets ADD COLUMN IF NOT EXISTS file_url TEXT;
```

## Implementation Details

### Files Created
1. **`/app/api/assets/upload-image/route.ts`**
   - Handles image upload to Supabase Storage
   - Uploads to path: `{organization_id}/{timestamp}-{filename}`
   - Creates asset record in database with public URL
   - Rolls back storage upload if database insert fails

2. **`/components/image-upload-form.tsx`**
   - Drag & drop file upload
   - Image preview before upload
   - Auto-detects image format (JPG, PNG, WebP, GIF, SVG)
   - Progress indicator during upload

### Files Modified
1. **`/components/asset-creator-content.tsx`**
   - Integrated ImageUploadForm for image asset type
   - Updated Asset Library table with:
     - Preview column (shows image thumbnails)
     - Actions column (View button to open full image)
   - Auto-refreshes library after successful upload

2. **`.env.local.example`**
   - Added `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` variable

## How It Works

### Upload Flow
1. User selects "Image" asset type in Creative section
2. User fills out asset name and selects/drags image file
3. Image preview appears in the upload form
4. On submit:
   - FormData is created with file + metadata
   - API route `/api/assets/upload-image` receives request
   - User authentication & organization validation
   - File uploaded to Supabase Storage bucket
   - Public URL retrieved from Supabase
   - Asset record created in database with `file_url`
   - Success response returned to frontend

### Storage Structure
```
assets/
  └── {organization-id}/
      ├── {timestamp}-image1.jpg
      ├── {timestamp}-image2.png
      └── {timestamp}-image3.webp
```

### Public URLs
Format: `{supabaseUrl}/storage/v1/object/public/assets/{orgId}/{filename}`

## Asset Library Features
- **Preview Column**: Shows 64x64px thumbnails of images
- **View Button**: Opens full-size image in new tab
- **Type Icons**: Visual indicators for image/video/text assets
- **Status Badges**: Color-coded (green=approved, yellow=draft, red=rejected)

## Testing Checklist
- [ ] Create Supabase storage bucket named "assets" (public)
- [ ] Add `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=assets` to `.env.local`
- [ ] Restart dev server
- [ ] Navigate to Creative section
- [ ] Select "Image" asset type
- [ ] Upload a test image
- [ ] Verify image appears in Asset Library with thumbnail
- [ ] Click "View" button to open full image in new tab
- [ ] Verify public URL format is correct

## Known Limitations
- No file size validation (consider adding max 10MB limit)
- No duplicate filename handling (uses timestamp to prevent conflicts)
- No delete functionality yet (files remain in storage)
- Video upload not yet implemented (placeholder still exists)

## Next Steps
1. Add file size validation
2. Implement delete functionality (remove from storage + database)
3. Add video upload support
4. Add image editing/cropping before upload
5. Add RLS policies to storage bucket for security
