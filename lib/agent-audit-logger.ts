/**
 * Agent API Audit Logger
 *
 * Logs all agent API actions to the agent_audit_log table for compliance,
 * debugging, and analytics. Logging is async and doesn't block responses.
 */

import { createClient } from '@supabase/supabase-js';

// Maximum size for request/response bodies before truncation (in characters)
const MAX_BODY_SIZE = 10000;

// Sensitive keys to sanitize from logged data
const SENSITIVE_KEYS = ['password', 'api_key', 'apiKey', 'token', 'secret', 'authorization'];

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  api_key_id: string;
  organization_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  request_method: string;
  request_path: string;
  request_body?: Record<string, unknown> | null;
  response_status: number;
  response_body?: Record<string, unknown> | null;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  duration_ms: number;
}

/**
 * Get Supabase service role client for audit logging
 * Uses service role to bypass RLS policies
 */
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[AuditLogger] Missing Supabase credentials');
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Sanitize sensitive data from objects
 * Recursively removes or masks sensitive keys
 */
function sanitizeData(data: unknown): unknown {
  if (!data) return data;

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const key in data) {
      if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData((data as Record<string, unknown>)[key]);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Truncate large objects to prevent database bloat
 */
function truncateData(data: unknown): unknown {
  if (!data) return data;

  const jsonString = JSON.stringify(data);
  if (jsonString.length <= MAX_BODY_SIZE) {
    return data;
  }

  // Truncate and add indicator
  const truncated = jsonString.substring(0, MAX_BODY_SIZE);
  return {
    __truncated: true,
    __original_size: jsonString.length,
    data: truncated + '...[TRUNCATED]',
  };
}

/**
 * Extract action name from request path and method
 * Examples:
 *   POST /api/v1/agent/campaigns/create -> "campaigns.create"
 *   GET /api/v1/agent/campaigns/list -> "campaigns.list"
 *   PATCH /api/v1/agent/campaigns/123/update -> "campaigns.update"
 */
export function extractAction(method: string, path: string): string {
  // Remove /api/v1/agent prefix or /api prefix
  let cleanPath = path.replace(/^\/api\/v1\/agent\/?/, '');
  // If it still starts with /api, remove that too
  cleanPath = cleanPath.replace(/^\/api\/?/, '');

  // Split path into segments
  const segments = cleanPath.split('/').filter(s => s);

  if (segments.length === 0) {
    return 'unknown';
  }

  // Extract resource type (first segment)
  const resourceType = segments[0];

  // Determine action from method and path
  const lastSegment = segments[segments.length - 1];

  // Handle explicit action names (create, list, update, delete, get)
  if (['create', 'list', 'update', 'delete', 'get', 'status'].includes(lastSegment)) {
    return `${resourceType}.${lastSegment}`;
  }

  // Handle assignment/unassignment endpoints first (before generic ID-based operations)
  if (method === 'POST' && segments.length > 2) {
    // Handle assignment endpoints like /campaigns/123/assets
    return `${resourceType}.${segments[2]}.assign`;
  }

  if (method === 'DELETE' && segments.length > 2) {
    // Handle unassignment endpoints
    return `${resourceType}.${segments[2]}.unassign`;
  }

  // Handle ID-based operations
  if (method === 'GET' && segments.length === 2) {
    return `${resourceType}.get`;
  }

  if (method === 'DELETE') {
    return `${resourceType}.delete`;
  }

  if (method === 'PATCH' || method === 'PUT') {
    return `${resourceType}.update`;
  }

  // Fallback
  return `${resourceType}.${method.toLowerCase()}`;
}

/**
 * Extract resource type and ID from response data
 */
export function extractResourceInfo(
  action: string,
  responseBody: Record<string, unknown> | null | undefined
): { resource_type?: string; resource_id?: string } {
  if (!responseBody || !responseBody.data) {
    return {};
  }

  const data = responseBody.data as Record<string, unknown>;
  const resource_type = action.split('.')[0]; // campaigns, assets, audiences

  // Try to extract ID from response
  let resource_id: string | undefined;

  // Check direct ID fields first
  if (data.id !== undefined) {
    resource_id = String(data.id);
  } else if (data.campaign_id !== undefined) {
    resource_id = String(data.campaign_id);
  } else if (data.asset_id !== undefined) {
    resource_id = String(data.asset_id);
  } else if (data.audience_id !== undefined) {
    resource_id = String(data.audience_id);
  }
  // Check nested objects (e.g., data.campaign.id, data.asset.id, data.audience.id)
  else if (data.campaign && typeof data.campaign === 'object' && (data.campaign as Record<string, unknown>).id !== undefined) {
    resource_id = String((data.campaign as Record<string, unknown>).id);
  } else if (data.asset && typeof data.asset === 'object' && (data.asset as Record<string, unknown>).id !== undefined) {
    resource_id = String((data.asset as Record<string, unknown>).id);
  } else if (data.audience && typeof data.audience === 'object' && (data.audience as Record<string, unknown>).id !== undefined) {
    resource_id = String((data.audience as Record<string, unknown>).id);
  }

  return { resource_type, resource_id };
}

/**
 * Log an audit entry (async, non-blocking)
 *
 * @param entry - Audit log entry data
 * @returns Promise that resolves when logging is complete (or fails silently)
 */
export async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    const client = getServiceClient();
    if (!client) {
      console.error('[AuditLogger] Cannot log: Supabase client unavailable');
      return;
    }

    // Sanitize and truncate request/response bodies
    const sanitizedEntry = {
      ...entry,
      request_body: entry.request_body
        ? truncateData(sanitizeData(entry.request_body))
        : null,
      response_body: entry.response_body
        ? truncateData(sanitizeData(entry.response_body))
        : null,
    };

    // Insert audit log entry
    const { error } = await client
      .from('agent_audit_log')
      .insert(sanitizedEntry);

    if (error) {
      console.error('[AuditLogger] Failed to insert audit log:', error);
    }
  } catch (err) {
    // Fail silently - don't let audit logging break the API
    console.error('[AuditLogger] Exception during audit logging:', err);
  }
}

/**
 * Create audit log entry from Next.js request/response
 * Helper function to make logging easier in API routes
 */
export function createAuditEntry(
  apiKeyId: string,
  organizationId: string,
  request: Request,
  response: { status: number; body?: Record<string, unknown> | null },
  startTime: number,
  requestBody?: Record<string, unknown> | null,
  errorMessage?: string
): AuditLogEntry {
  const url = new URL(request.url);
  const action = extractAction(request.method, url.pathname);
  const { resource_type, resource_id } = extractResourceInfo(action, response.body);

  return {
    api_key_id: apiKeyId,
    organization_id: organizationId,
    action,
    resource_type,
    resource_id,
    request_method: request.method,
    request_path: url.pathname,
    request_body: requestBody,
    response_status: response.status,
    response_body: response.body,
    error_message: errorMessage,
    ip_address: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Wrapper function for API routes to automatically log requests
 * Usage:
 *   const result = await withAuditLogging(authContext, request, startTime, async () => {
 *     // Your API logic here
 *     return NextResponse.json({ data: ... }, { status: 200 });
 *   });
 */
export async function withAuditLogging(
  authContext: { apiKey: { id: string }; organization: { id: string } },
  request: Request,
  startTime: number,
  handler: () => Promise<Response>
): Promise<Response> {
  let requestBody: Record<string, unknown> | null = null;

  try {
    // Try to parse request body for logging
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      try {
        requestBody = await request.clone().json() as Record<string, unknown>;
      } catch {
        // Body might not be JSON, that's okay
      }
    }
  } catch {
    // Ignore body parsing errors
  }

  try {
    // Execute the handler
    const response = await handler();

    // Parse response body for logging
    let responseBody: Record<string, unknown> | null = null;
    try {
      const responseClone = response.clone();
      responseBody = await responseClone.json();
    } catch {
      // Response might not be JSON
    }

    // Log the audit entry (async, non-blocking)
    logAuditEntry(
      createAuditEntry(
        authContext.apiKey.id,
        authContext.organization.id,
        request,
        { status: response.status, body: responseBody },
        startTime,
        requestBody
      )
    ).catch(err => {
      console.error('[AuditLogger] Failed to log audit entry:', err);
    });

    return response;
  } catch (error: unknown) {
    // Log failed request
    logAuditEntry(
      createAuditEntry(
        authContext.apiKey.id,
        authContext.organization.id,
        request,
        { status: 500, body: { error: error.message } },
        startTime,
        requestBody,
        error.message
      )
    ).catch(err => {
      console.error('[AuditLogger] Failed to log audit entry for error:', err);
    });

    throw error;
  }
}
