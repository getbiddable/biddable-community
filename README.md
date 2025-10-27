# Biddable App

## Overview

**Biddable** is an advertising platform for SMBs (Small and Medium Businesses) that allows users to manage advertising campaigns across multiple platforms. Users can create campaigns, upload creative assets, define target audiences, and assign both to campaigns for comprehensive ad management.

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **UI Components**: shadcn/ui (Radix UI primitives) + Tailwind CSS
- **Authentication**: Supabase Auth (email/password)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (for image uploads)
- **Styling**: Tailwind CSS with dark mode by default
- **Package Manager**: pnpm

## Project Structure

```
bid-app/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API routes
│   │   ├── assets/              # Asset CRUD operations
│   │   ├── audiences/           # Audience CRUD operations
│   │   ├── campaigns/           # Campaign CRUD operations
│   │   ├── chat/                # Chat widget backend
│   │   └── profile/             # User profile data
│   ├── assets/                  # Creative assets page
│   ├── audiences/               # Audiences management
│   │   └── [id]/               # Dynamic audience detail pages
│   ├── campaigns/               # Campaigns management
│   │   └── [id]/               # Dynamic campaign detail pages
│   ├── login/                   # Login page
│   ├── signup/                  # Signup page
│   ├── profile/                 # User profile page
│   ├── reporting/               # Reporting/analytics
│   ├── layout.tsx               # Root layout with auth
│   └── page.tsx                 # Dashboard (homepage)
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── asset-creator-content.tsx
│   ├── audience-detail-content.tsx
│   ├── audiences-content.tsx
│   ├── campaign-detail-content.tsx
│   ├── campaigns-content.tsx
│   ├── chat-widget.tsx
│   ├── dashboard-content.tsx
│   ├── navigation.tsx
│   └── ...
├── lib/                         # Utility libraries
│   ├── supabase/               # Supabase client configs
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client
│   ├── auth.ts                 # Auth helper functions
│   ├── auth-context.tsx        # Auth React context
│   └── text-ads.ts             # Text ad validation
├── supabase/
│   └── migrations/             # SQL migrations
├── middleware.ts               # Route protection
├── ClaudeLog.txt              # Development history log
└── package.json
```

## Local Setup Instructions

### Prerequisites

- **Node.js** 18+ installed
- **pnpm** installed (`npm install -g pnpm`)
- **Supabase account** (free tier works)
- **Git** installed

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd bid-app

# Install dependencies
pnpm install
```

### Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish provisioning (~2 minutes)
3. Go to **Settings** → **API** and copy:
   - Project URL
   - Anon/Public key

### Step 3: Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp .env.local.example .env.local
```

Add your Supabase credentials and AI generation settings:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=biddable-images

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI Image Generation (n8n)
N8N_WEBHOOK_URL=your-n8n-webhook-url
N8N_WEBHOOK_SECRET=generate-random-secret
AI_CALLBACK_SECRET=generate-random-secret
AI_GENERATION_RATE_LIMIT_PER_HOUR=100
```

**Note**: Generate secrets with `openssl rand -base64 32`

### Step 4: Database Setup

Run the following SQL migrations **in order** in the Supabase SQL Editor:

1. **Organizations & Members** (if not exists):
```sql
-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "Users can view their org members" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their orgs" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );
```

2. **Assets Table**:
```bash
# Run: supabase/migrations/create_assets_table.sql
```

3. **Campaigns Table**:
```sql
CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  platforms JSONB DEFAULT '[]',
  status BOOLEAN DEFAULT true,
  budget INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  amount_collected NUMERIC DEFAULT 0,
  amount_spent NUMERIC DEFAULT 0,
  media_fee_charged NUMERIC DEFAULT 0,
  subscription_plan TEXT DEFAULT 'free',
  payment_date TIMESTAMP WITH TIME ZONE
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their campaigns" ON campaigns
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create campaigns" ON campaigns
  FOR INSERT WITH CHECK (created_by = auth.uid());
```

4. **Audiences Table**:
```bash
# Run: supabase/migrations/convert_audience_id_to_bigint.sql
# (This includes both audiences and campaign_audiences tables)
```

5. **Campaign-Assets Junction Table**:
```bash
# Run: supabase/migrations/create_campaign_assets_table.sql
```

6. **AI Image Requests Table** (for async AI generation):
```bash
# Run: supabase/migrations/create_ai_image_requests_table.sql
```

### Step 5: Supabase Storage Setup

1. In Supabase Dashboard, go to **Storage**
2. Create a new bucket called `biddable-images`
3. Make the bucket **public**
4. Add RLS policies:

```sql
-- Allow authenticated users to upload to their org folder
CREATE POLICY "Users can upload to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'biddable-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their org files
CREATE POLICY "Users can view their org files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'biddable-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 6: Create Test User & Organization

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Click **Add User** (via email)
3. Create a user (e.g., `test@example.com` / `password123`)
4. Run this SQL to create a test org and add the user:

```sql
-- Create test organization
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Organization')
ON CONFLICT (id) DO NOTHING;

-- Add user to organization (replace with your user's UUID)
INSERT INTO organization_members (organization_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'YOUR-USER-UUID-HERE',
  'admin'
)
ON CONFLICT (organization_id, user_id) DO NOTHING;
```

### Step 7: Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your test user credentials.

## Core Features & How They Work

### 1. Authentication & Organizations

- **Multi-org support**: Users can belong to multiple organizations
- **Organization-scoped data**: Assets and audiences are shared within an organization
- **User-owned data**: Campaigns are owned by individual users
- **RLS (Row Level Security)**: All database queries are automatically filtered by organization/user

### 2. Campaigns

- **Location**: `/campaigns` (list) and `/campaigns/[id]` (detail)
- **Database**: `campaigns` table with BIGINT ID
- **Features**:
  - Create campaigns with name, platforms, budget, dates, goal
  - View all campaigns in a table
  - Click campaign name to view details
  - Budget tracking with progress bar
  - Assign creative assets to campaigns
  - Assign target audiences to campaigns

### 3. Creative Assets

- **Location**: `/assets`
- **Database**: `assets` table with UUID ID
- **Types**:
  - **Images**: Upload to Supabase Storage, displays thumbnails
  - **AI-Generated Images**: Async generation via n8n webhook with polling (no timeout issues)
  - **Text Ads**: Google Search Ads (RSA/ETA formats) with validation and preview
  - **Video**: Placeholder (not yet implemented)
- **Features**:
  - Upload images with drag & drop
  - AI image generation with real-time status updates (pending → processing → completed)
  - Create text ads with character limits
  - Preview how ads will appear
  - Assign to campaigns via junction table `campaign_assets`
  - Organization-scoped (shared within org)
- **AI Generation Architecture**: Asynchronous with webhook callbacks - production-ready for Vercel deployment

### 4. Audiences

- **Location**: `/audiences` (list) and `/audiences/[id]` (detail)
- **Database**: `audiences` table with BIGINT ID
- **Targeting Criteria**:
  - Demographics: age range, genders (array)
  - Geographic: locations (array)
  - Psychographic: interests, behaviors (arrays)
  - JSONB field for platform-specific targeting
- **Features**:
  - Create audiences with targeting criteria
  - Edit audiences inline on detail pages
  - Archive audiences (soft delete)
  - Assign to campaigns via junction table `campaign_audiences`
  - Organization-scoped (shared within org)

### 5. Many-to-Many Relationships

The app uses junction tables for flexible assignments:

- **`campaign_assets`**: Links campaigns to creative assets
  - One campaign can have multiple assets
  - One asset can be used in multiple campaigns
- **`campaign_audiences`**: Links campaigns to target audiences
  - One campaign can target multiple audiences
  - One audience can be used in multiple campaigns

### 6. Chat Widget

- **Location**: Available on all pages (bottom right)
- **Features**: AI chat assistant with markdown rendering
- **Backend**: `/api/chat` route

## Database Schema Summary

### ID Types (Important!)
- **Campaigns**: `BIGINT` (1, 2, 3...) - Simple numeric IDs
- **Audiences**: `BIGINT` (1, 2, 3...) - Simple numeric IDs
- **Assets**: `UUID` - Appropriate for file-based content
- **Organizations**: `UUID`
- **Users**: `UUID` (Supabase managed)

### Key Tables
- `organizations` - Organization records
- `organization_members` - User-org membership (many-to-many)
- `campaigns` - Campaign records (user-owned)
- `assets` - Creative assets (org-scoped)
- `audiences` - Target audiences (org-scoped)
- `ai_image_requests` - Async AI image generation tracking (pending/processing/completed/failed)
- `campaign_assets` - Junction table (campaign ↔ asset)
- `campaign_audiences` - Junction table (campaign ↔ audience)

## Common Development Tasks

### Adding a New Page

1. Create route in `app/your-page/page.tsx`
2. Create component in `components/your-page-content.tsx`
3. Add navigation link in `components/navigation.tsx`
4. Add route to middleware if it needs protection

### Adding a New API Endpoint

1. Create file in `app/api/your-endpoint/route.ts`
2. Export `GET`, `POST`, `PUT`, or `DELETE` functions
3. Always authenticate user first: `await supabase.auth.getUser()`
4. Use server client: `import { createClient } from '@/lib/supabase/server'`

### Adding RLS Policies

All tables should have RLS enabled:

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Example: Users can only see their own records
CREATE POLICY "policy_name" ON your_table
  FOR SELECT
  USING (user_id = auth.uid());
```

## Troubleshooting

### "Unauthorized" errors
- Check that user is logged in
- Verify user exists in `organization_members` table
- Check RLS policies on the table

### Database queries returning empty
- RLS policies might be too restrictive
- Check that user has proper organization membership
- Verify foreign key relationships

### Images not uploading
- Check storage bucket exists and is public
- Verify storage RLS policies
- Check `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` env var

### Middleware redirect loops
- Check that protected routes are listed in `middleware.ts`
- Verify auth cookies are being set properly

## Testing Checklist

Before deploying:

- [ ] Can create a new user
- [ ] Can log in and log out
- [ ] Can create a campaign
- [ ] Can view campaign detail page
- [ ] Can upload an image asset
- [ ] Can create a text ad
- [ ] Can assign asset to campaign
- [ ] Can create an audience
- [ ] Can edit audience details
- [ ] Can assign audience to campaign
- [ ] Can view profile page
- [ ] Cannot see data from other organizations

## Documentation Files

- **ClaudeLog.txt** - Complete development history with all changes
- **AUDIENCES_SETUP.md** - Detailed audiences feature documentation
- **CAMPAIGN_ASSETS_SETUP.md** - Asset assignment documentation
- **IMAGE_UPLOAD_SETUP.md** - Image upload setup guide
- **HANDOFF.md** - This file

## Next Steps / Future Enhancements

- Dashboard with real campaign data (currently mock data)
- Campaign editing and deletion
- Bulk operations (assign multiple assets/audiences at once)
- Asset filtering and search
- Audience analytics (which campaigns use which audiences)
- Stripe payment integration for campaign budgets
- Platform-specific ad preview (Google, YouTube, Reddit, Meta)
- Campaign performance reporting with real metrics
- Multi-language support
- Mobile responsive improvements

## Support & Questions

For questions about the codebase:
1. Check **ClaudeLog.txt** for detailed implementation history
2. Review the relevant documentation file in the root directory
3. Check Supabase Dashboard for database schema and RLS policies
4. Review the API route files for endpoint implementation details

## License

[Add your license information here before open-sourcing]

---

**Built with Next.js 14, TypeScript, Supabase, and Tailwind CSS**

Last Updated: October 2025
