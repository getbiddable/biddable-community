# MCP Architecture Setup Guide

## Overview

The agent now uses a **localhost MCP server** for tool execution, providing better separation and flexibility.

```
User → Next.js App → Local LLM → MCP Client → MCP Server → Agent API → Database
          (3000)     (ngrok)      (stdio)      (stdio)       (3000)
```

## What Changed

### Before (Coupled):
- Tools defined in Next.js
- Direct Agent API calls from Next.js
- Harder to swap LLMs

### After (MCP):
- ✅ Tools defined in separate MCP server
- ✅ Standard MCP protocol
- ✅ Easy to swap LLMs (OpenAI, Claude, local, etc.)
- ✅ Can use with Claude Desktop
- ✅ Localhost only (secure)

## Files Created

1. **`mcp-server/`** - Standalone MCP server
   - `index.js` - Main MCP server with 11 tools
   - `package.json` - Dependencies (@modelcontextprotocol/sdk)
   - `README.md` - Documentation

2. **`lib/ai/mcp-client.ts`** - Next.js MCP client
   - Spawns MCP server as child process
   - Communicates via stdio
   - Auto-starts on first use

3. **Updated `app/api/agent/chat/route.ts`**
   - Now uses MCP client instead of direct tool executor
   - Cleaner separation of concerns

## How It Works

### 1. Next.js App Starts
```bash
pnpm dev  # Port 3000
```

### 2. First Agent Request
- MCP client automatically spawns MCP server as child process
- MCP server starts listening on stdio (not network!)
- Communication via JSON-RPC over stdin/stdout

### 3. Agent Makes Tool Call
```
LLM says: "Call create_campaign with {...}"
    ↓
MCP Client sends: {"method": "tools/call", "params": {...}}
    ↓
MCP Server executes: POST http://localhost:3000/api/v1/agent/campaigns/create
    ↓
MCP Server returns: {"result": {...}}
    ↓
LLM receives result and continues
```

## Security

✅ **Localhost Only**: MCP server uses stdio, no network binding
✅ **Not Exposed**: Cannot be accessed from internet
✅ **API Key Auth**: MCP server authenticates with Agent API
✅ **Same Security**: All existing Agent API security applies

## Testing

### 1. Restart Next.js
```bash
# Stop current server
# Then restart to load MCP changes
pnpm dev
```

### 2. Go to Agent Chat
Navigate to: `http://localhost:3000/agent-chat`

### 3. Test Campaign Creation
Try: **"Create a Reddit campaign for winter sale with $5000 budget from tomorrow for 30 days"**

Expected:
- ✅ Agent calls `create_campaign` tool
- ✅ MCP client spawns MCP server
- ✅ MCP server calls Agent API
- ✅ Campaign created successfully
- ✅ Agent confirms with campaign ID

### 4. Check Logs
You should see:
```
[MCP Server] Biddable Agent MCP Server running on stdio
[MCP Client] Starting MCP server
[MCP] Tool called: create_campaign
[MCP] Executing create_campaign -> POST http://localhost:3000/api/v1/agent/campaigns/create
```

## Bonus: Use with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "biddable-agent": {
      "command": "node",
      "args": ["/absolute/path/to/bid-app/mcp-server/index.js"],
      "env": {
        "NEXT_PUBLIC_APP_URL": "http://localhost:3000",
        "TEST_API_KEY": "your-agent-api-key-here"
      }
    }
  }
}
```

Then in Claude Desktop:
- 🔨 Icon shows available tools
- Can create campaigns directly from Claude Desktop!

## Troubleshooting

### MCP Server Won't Start
- Check `mcp-server/package.json` exists
- Run `cd mcp-server && pnpm install`
- Check `TEST_API_KEY` in `.env.local`

### Tools Not Working
- Check MCP server logs in console
- Verify Agent API is running (`http://localhost:3000/api/v1/agent/campaigns/list`)
- Check API key has correct permissions

### Child Process Issues
- MCP server auto-starts with Next.js app
- Automatically restarts if it crashes
- Uses same environment variables as Next.js

## Production Deployment

### Option 1: Same Machine (Recommended)
```bash
# Both services on same server
pm2 start ecosystem.config.js
```

### Option 2: Systemd
```ini
[Unit]
Description=Next.js App with MCP

[Service]
ExecStart=/usr/bin/pnpm start
WorkingDirectory=/var/www/bid-app
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

MCP server auto-starts as child process - nothing extra needed!

## Benefits

1. ✅ **Model Agnostic** - Easy to swap OpenAI → Claude → Local LLM
2. ✅ **Standard Protocol** - MCP is becoming industry standard
3. ✅ **Better Testing** - Test tools independently
4. ✅ **Claude Desktop** - Bonus feature for power users
5. ✅ **Cleaner Code** - Separation of concerns
6. ✅ **No Extra Infrastructure** - No separate service to manage
7. ✅ **Secure** - Localhost only, not exposed to internet

## Next Steps

1. Test campaign creation via agent
2. Verify all 11 tools work correctly
3. Test with your local LLM via ngrok
4. Consider adding more tools as needed
5. Optional: Set up Claude Desktop integration

Enjoy your new MCP-powered agent! 🚀
