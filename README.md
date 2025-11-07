# Biddable Community Edition

## Overview

**Biddable Community Edition** is an open-source advertising platform for SMBs (Small and Medium Businesses) that allows users to manage advertising campaigns across multiple platforms. Users can create campaigns, upload creative assets, define target audiences, and assign both to campaigns for comprehensive ad management.

**New in v0.2.0**: Biddable now features **AI Agent integration**, allowing AI assistants to programmatically create and manage campaigns through a comprehensive Agent API and MCP (Model Context Protocol) server.

This is the community-driven version of Biddable, licensed under AGPL-3.0.

## 🤖 What's New in v0.2.0 - AI Agent Integration

Version 0.2.0 introduces powerful agentic advertising capabilities:

### Agent API
- **RESTful API** for AI agents and automation tools
- **Secure authentication** with organization-scoped API keys
- **Complete campaign lifecycle management** (create, read, update, delete)
- **Asset and audience assignment** via API
- **Budget controls** with $10,000/month org limits
- **Rate limiting** to prevent abuse (1000 req/hour)
- **Comprehensive error handling** with detailed error codes

### MCP Server Integration
- **Model Context Protocol** server for tool execution
- **Works with any LLM** (OpenAI, Claude, local models)
- **11+ tools** for campaign, asset, and audience management
- **Claude Desktop compatible** - manage campaigns from Claude Desktop app
- **Localhost-only** for security (stdio communication)
- **Auto-starts** as child process with Next.js app

### Use Cases
- **Conversational campaign creation**: "Create a Reddit campaign for winter sale with $5000 budget"
- **Bulk operations**: AI agents can create multiple campaigns programmatically
- **Workflow automation**: Integrate with existing marketing automation tools
- **Natural language interface**: Non-technical users can create campaigns via chat
- **Cross-platform orchestration**: Manage Google, Reddit, YouTube, and Meta campaigns through one API

### Documentation
- Complete Agent API docs in `docs/agent-api/`
- MCP setup guide in `MCP_SETUP.md`
- API reference with examples (curl, Python, JavaScript)
- Comprehensive error codes and handling guide

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **UI Components**: shadcn/ui (Radix UI primitives) + Tailwind CSS
- **Authentication**: Supabase Auth (email/password)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (for image uploads)
- **AI Integration**: Model Context Protocol (MCP) server, Agent API with OpenAI SDK
- **API Security**: bcrypt key hashing, rate limiting, budget controls
- **Styling**: Tailwind CSS with dark mode by default
- **Package Manager**: pnpm

## Project Structure

```
bid-app/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API routes
│   │   ├── v1/agent/            # 🤖 Agent API endpoints (NEW in v0.2)
│   │   │   ├── campaigns/       # Campaign management
│   │   │   ├── assets/          # Asset operations
│   │   │   ├── audiences/       # Audience operations
│   │   │   └── budget/          # Budget tracking
│   │   ├── assets/              # Asset CRUD operations
│   │   ├── audiences/           # Audience CRUD operations
│   │   ├── campaigns/           # Campaign CRUD operations
│   │   ├── chat/                # Chat widget backend
│   │   └── profile/             # User profile & API key management
│   ├── agent-chat/              # 🤖 AI agent chat interface (NEW)
│   ├── agent-logs/              # 🤖 Agent audit logs (NEW)
│   ├── assets/                  # Creative assets page
│   ├── audiences/               # Audiences management
│   ├── campaigns/               # Campaigns management
│   ├── login/                   # Login page
│   ├── profile/                 # User profile page
│   └── ...
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── agent-chat-widget.tsx   # 🤖 AI agent chat (NEW)
│   ├── asset-creator-content.tsx
│   ├── campaigns-content.tsx
│   └── ...
├── lib/                         # Utility libraries
│   ├── ai/                      # 🤖 AI agent infrastructure (NEW)
│   │   ├── mcp-client.ts       # MCP client for tool execution
│   │   ├── openai-client.ts    # OpenAI SDK wrapper
│   │   └── tool-executor.ts    # Agent tool definitions
│   ├── supabase/               # Supabase client configs
│   ├── agent-api-keys.ts       # 🤖 API key management (NEW)
│   ├── agent-rate-limiter.ts   # 🤖 Rate limiting (NEW)
│   └── ...
├── mcp-server/                  # 🤖 Model Context Protocol server (NEW)
│   ├── index.js                # MCP server with 11 agent tools
│   └── package.json            # MCP dependencies
├── docs/                        # Documentation
│   └── agent-api/              # 🤖 Agent API documentation (NEW)
│       ├── README.txt          # API overview
│       ├── getting-started.txt # Quick start guide
│       ├── api-reference.txt   # Complete API reference
│       ├── error-codes.txt     # Error handling
│       └── examples.txt        # Code examples
├── supabase/migrations/         # SQL migrations
├── MCP_SETUP.md                # 🤖 MCP server setup guide (NEW)
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
git clone https://github.com/getbiddable/biddable-community.git
cd biddable-community

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

### 7. 🤖 AI Agent Integration (NEW in v0.2.0)

Biddable v0.2.0 introduces comprehensive AI agent capabilities for programmatic campaign management:

#### Agent API (`/api/v1/agent/`)
- **Authentication**: Secure API keys with bcrypt hashing and organization scoping
- **Campaign Operations**: Full CRUD (Create, Read, Update, Delete) via RESTful API
- **Asset Management**: List assets, assign to campaigns programmatically
- **Audience Management**: List audiences, assign to campaigns programmatically
- **Budget Tracking**: Real-time budget status with $10,000/month org limits
- **Rate Limiting**: Configurable per-endpoint limits (1000 req/hour global)
- **Audit Logging**: Complete request/response logging for compliance
- **Error Handling**: Comprehensive error codes with detailed messages

#### Model Context Protocol (MCP) Server
- **Standards-Based**: Implements MCP spec for tool execution
- **11+ Tools**: Campaign creation, updates, asset/audience management, budget checks
- **Multi-LLM Support**: Works with OpenAI, Claude, local models (via OpenAI SDK)
- **Claude Desktop Integration**: Manage campaigns directly from Claude Desktop app
- **Secure by Default**: Localhost-only stdio communication (no network exposure)
- **Auto-Managed**: Starts automatically with Next.js app, no manual setup

#### Agent Chat Interface
- **Natural Language**: Create campaigns via conversational interface
- **Real-Time**: Streaming responses with tool execution visibility
- **Context-Aware**: Maintains conversation history for complex workflows
- **Error Recovery**: Graceful handling with helpful error messages

#### API Key Management
- **Self-Service**: Generate keys from user profile page
- **Organization-Scoped**: Keys work across entire org
- **Encrypted Storage**: bcrypt hashing with 10 rounds
- **Revocable**: Disable keys instantly via dashboard
- **Audit Trail**: Track all API key usage

#### Use Case Examples
```bash
# Create campaign via API
curl -X POST http://localhost:3000/api/v1/agent/campaigns/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"name": "Summer Sale", "platforms": ["reddit"], "budget": 5000, ...}'

# Natural language via agent chat
"Create a Reddit campaign for our winter sale with $5000 budget starting tomorrow"

# Claude Desktop integration
Use MCP tools directly from Claude Desktop to manage campaigns
```

See `docs/agent-api/` for complete API documentation and `MCP_SETUP.md` for MCP server setup.

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

### User Guides
- **README.md** - This comprehensive setup and feature guide
- **CONTRIBUTING.md** - Contribution guidelines
- **MCP_SETUP.md** - 🤖 MCP server setup and configuration (NEW)
- **AUDIENCES_SETUP.md** - Detailed audiences feature documentation
- **CAMPAIGN_ASSETS_SETUP.md** - Asset assignment documentation
- **IMAGE_UPLOAD_SETUP.md** - Image upload setup guide

### Agent API Documentation (NEW in v0.2.0)
- **docs/agent-api/README.txt** - Agent API overview and quick start
- **docs/agent-api/getting-started.txt** - Step-by-step setup guide
- **docs/agent-api/api-reference.txt** - Complete endpoint reference
- **docs/agent-api/error-codes.txt** - Error handling guide
- **docs/agent-api/examples.txt** - Code examples (curl, Python, JavaScript)

## Next Steps / Future Enhancements

### Core Features
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

### AI Agent Enhancements (v0.3.0+)
- **Multi-modal agents**: Support for image and video analysis
- **Advanced workflows**: Multi-step campaign optimization
- **A/B testing automation**: Agent-driven creative testing
- **Performance analytics**: AI-powered campaign insights
- **Budget optimization**: Automatic budget allocation
- **Cross-platform scheduling**: Intelligent ad scheduling
- **Audience discovery**: AI-suggested targeting
- **Creative generation**: Integrated AI creative tools

## Support & Questions

For questions about the codebase:
1. Check **ClaudeLog.txt** for detailed implementation history
2. Review the relevant documentation file in the root directory
3. Check Supabase Dashboard for database schema and RLS policies
4. Review the API route files for endpoint implementation details

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

This means:
- ✅ You can use, modify, and distribute this software freely
- ✅ You can use it for commercial purposes
- ⚠️ If you modify and deploy this software as a service, you must make your modifications available under AGPL-3.0
- ⚠️ Any modifications must also be licensed under AGPL-3.0

See the [LICENSE](LICENSE) file for full details.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

---

**Built with Next.js 14, TypeScript, Supabase, Tailwind CSS, and AI Agent capabilities**

Version: 0.2.0
Last Updated: November 2025
