# Biddable Agent MCP Server

Model Context Protocol (MCP) server exposing 11 Biddable Agent API tools.

## Features

- ✅ 11 agent tools (campaigns, assets, audiences, budget)
- ✅ Localhost only (not exposed to internet)
- ✅ Standard MCP protocol
- ✅ Works with Claude Desktop, any MCP client, or your Next.js app
- ✅ Direct Agent API integration

## Installation

```bash
cd mcp-server
pnpm install
# or
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Update `.env`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
TEST_API_KEY=your-agent-api-key-from-main-app
```

## Usage

### Option 1: With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "biddable-agent": {
      "command": "node",
      "args": ["/absolute/path/to/bid-app/mcp-server/index.js"],
      "env": {
        "NEXT_PUBLIC_APP_URL": "http://localhost:3000",
        "TEST_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Option 2: Standalone (for testing)

```bash
npm start
```

The server runs via stdio and waits for MCP protocol messages.

### Option 3: With Your Next.js App

The Next.js app can spawn the MCP server as a child process and communicate via stdio.

## Available Tools

### Campaign Tools
- `list_campaigns` - List campaigns with filters
- `get_campaign` - Get campaign details by ID
- `create_campaign` - Create new campaign (single platform)

### Asset Tools
- `list_assets` - List assets (images, videos, text ads)
- `get_asset` - Get asset details by UUID

### Audience Tools
- `list_audiences` - List audience segments
- `get_audience` - Get audience details by ID

### Assignment Tools
- `assign_asset_to_campaign` - Link asset to campaign
- `assign_audience_to_campaign` - Link audience to campaign

### Budget Tools
- `get_budget_status` - View budget utilization

## Security

- **Localhost only**: Server uses stdio transport (no network binding)
- **API Key auth**: All Agent API calls require authentication
- **Not exposed**: Cannot be accessed from internet
- **Safe for production**: Run alongside Next.js app

## Development

Watch mode (auto-restart on changes):
```bash
npm run dev
```

## Architecture

```
MCP Client (Claude Desktop / Next.js)
    ↓ stdio
MCP Server (this)
    ↓ HTTP + API Key
Agent API (Next.js /api/v1/agent/*)
    ↓
Database
```
