/**
 * MCP Client for Next.js
 *
 * Communicates with the localhost MCP server to execute agent tools.
 * Uses child process with stdio communication.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface MCPToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * MCP Client - manages connection to MCP server
 */
export class MCPClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();
  private buffer = '';

  constructor() {}

  /**
   * Start the MCP server process
   */
  async start() {
    if (this.process) {
      console.log('[MCP Client] Already running');
      return;
    }

    const mcpServerPath = path.join(process.cwd(), 'mcp-server', 'index.js');

    console.log('[MCP Client] Starting MCP server:', mcpServerPath);

    this.process = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        TEST_API_KEY: process.env.TEST_API_KEY,
      },
    });

    this.process.stdin?.setDefaultEncoding('utf-8');

    // Handle stdout (MCP responses)
    this.process.stdout?.on('data', (data) => {
      this.handleStdout(data);
    });

    // Handle stderr (logs)
    this.process.stderr?.on('data', (data) => {
      console.log('[MCP Server]', data.toString().trim());
    });

    // Handle exit
    this.process.on('exit', (code) => {
      console.log('[MCP Client] Server exited with code:', code);
      this.process = null;
    });

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Handle stdout data from MCP server
   */
  private handleStdout(data: Buffer) {
    this.buffer += data.toString();

    // Process complete JSON messages (separated by newlines)
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch (error) {
        console.error('[MCP Client] Failed to parse message:', line);
      }
    }
  }

  /**
   * Handle MCP protocol message
   */
  private handleMessage(message: any) {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message || 'MCP request failed'));
      } else {
        resolve(message.result);
      }
    }
  }

  /**
   * Send MCP request and wait for response
   */
  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('MCP server not running');
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const requestStr = JSON.stringify(request) + '\n';
      this.process!.stdin!.write(requestStr);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * List available tools
   */
  async listTools() {
    return await this.sendRequest('tools/list', {});
  }

  /**
   * Execute a tool
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args,
    });

    return result;
  }

  /**
   * Stop the MCP server
   */
  stop() {
    if (this.process) {
      console.log('[MCP Client] Stopping MCP server');
      this.process.kill();
      this.process = null;
    }
  }
}

/**
 * Singleton MCP client instance
 */
let mcpClient: MCPClient | null = null;

export async function getMCPClient(): Promise<MCPClient> {
  if (!mcpClient) {
    mcpClient = new MCPClient();
    await mcpClient.start();
  }
  return mcpClient;
}

/**
 * Execute an MCP tool
 */
export async function executeMCPTool(name: string, args: Record<string, unknown>): Promise<any> {
  const client = await getMCPClient();
  const result = await client.executeTool(name, args);

  if (result.isError) {
    throw new Error(result.content[0]?.text || 'Tool execution failed');
  }

  // Parse JSON response
  const text = result.content[0]?.text || '{}';
  return JSON.parse(text);
}
