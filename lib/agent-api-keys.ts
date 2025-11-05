import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { encrypt, decrypt } from '@/lib/encryption'

/**
 * API Key Format: bbl_[32 random characters]
 * Example: bbl_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
 */

const API_KEY_PREFIX = 'bbl_'
const API_KEY_LENGTH = 32 // characters after prefix

/**
 * Generate a random API key with the format: bbl_[32 chars]
 */
export function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let key = API_KEY_PREFIX

  for (let i = 0; i < API_KEY_LENGTH; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return key
}

/**
 * Hash an API key using bcrypt
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(apiKey, saltRounds)
}

/**
 * Verify an API key against a hash
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(apiKey, hash)
}

/**
 * Get the key prefix for display (first 12 characters)
 * Example: bbl_1a2b3c4d...
 */
export function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12) + '...'
}

/**
 * Create a new API key for an organization
 */
export async function createApiKey(params: {
  organizationId: string
  userId: string
  name: string
  description?: string
  permissions?: Record<string, string[]>
  expiresAt?: Date
  metadata?: Record<string, any>
}) {
  const supabase = await createClient()

  // Generate the API key
  const apiKey = generateApiKey()
  const keyHash = await hashApiKey(apiKey)
  const keyPrefix = getKeyPrefix(apiKey)

  // Insert into database
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      organization_id: params.organizationId,
      created_by: params.userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: params.name,
      description: params.description,
      permissions: params.permissions || {},
      expires_at: params.expiresAt?.toISOString(),
      metadata: params.metadata || {},
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`)
  }

  // Return the API key (only time it will be shown!)
  return {
    id: data.id,
    apiKey, // Plain text key - ONLY returned once
    keyPrefix,
    name: data.name,
    createdAt: data.created_at,
  }
}

/**
 * List all API keys for an organization
 */
export async function listApiKeys(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`)
  }

  return data
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(keyId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId)

  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`)
  }

  return { success: true }
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(keyId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)

  if (error) {
    throw new Error(`Failed to delete API key: ${error.message}`)
  }

  return { success: true }
}

/**
 * Validate an API key and return the associated data
 * Used by the agent API middleware
 */
export async function validateApiKey(apiKey: string) {
  // Use service role key to bypass RLS - we're doing our own auth here
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Get all active API keys (we need to check the hash)
  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to validate API key: ${error.message}`)
  }

  // Check each key's hash
  for (const key of keys || []) {
    const isValid = await verifyApiKey(apiKey, key.key_hash)

    if (isValid) {
      // Check expiration
      if (key.expires_at && new Date(key.expires_at) < new Date()) {
        return { valid: false, reason: 'expired' }
      }

      // Update last_used_at
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', key.id)

      return {
        valid: true,
        apiKey: {
          id: key.id,
          organizationId: key.organization_id,
          name: key.name,
          permissions: key.permissions,
          metadata: key.metadata,
        },
      }
    }
  }

  return { valid: false, reason: 'invalid' }
}

/**
 * Update an API key's metadata
 */
export async function updateApiKey(
  keyId: string,
  updates: {
    name?: string
    description?: string
    permissions?: Record<string, string[]>
    expiresAt?: Date | null
    metadata?: Record<string, any>
  }
) {
  const supabase = await createClient()

  const updateData: any = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.permissions !== undefined) updateData.permissions = updates.permissions
  if (updates.expiresAt !== undefined) {
    updateData.expires_at = updates.expiresAt ? updates.expiresAt.toISOString() : null
  }
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata

  const { data, error } = await supabase
    .from('api_keys')
    .update(updateData)
    .eq('id', keyId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update API key: ${error.message}`)
  }

  return data
}

/**
 * Get or create an encrypted API key for the hosted agent
 *
 * This function is used by the hosted agent backend to obtain an API key
 * for making requests to the Agent API. The key is:
 * - Stored encrypted in the database (encrypted_key column)
 * - Decrypted server-side only when needed
 * - Never exposed to the client or LLM
 *
 * @param organizationId - The organization UUID
 * @returns The plain text API key (server-side only!)
 */
export async function getOrCreateHostedAgentApiKey(organizationId: string): Promise<string> {
  // Use service role key to bypass RLS
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const AGENT_KEY_NAME = 'Hosted Agent (Auto-generated)'

  // Check if encrypted key already exists
  const { data: existingKey, error: fetchError } = await supabase
    .from('api_keys')
    .select('id, encrypted_key')
    .eq('organization_id', organizationId)
    .eq('name', AGENT_KEY_NAME)
    .eq('is_active', true)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`Failed to fetch hosted agent API key: ${fetchError.message}`)
  }

  // If key exists and has encrypted_key, decrypt and return it
  if (existingKey && existingKey.encrypted_key) {
    try {
      const decryptedKey = decrypt(existingKey.encrypted_key)
      return decryptedKey
    } catch (error) {
      console.error('Failed to decrypt existing agent API key:', error)
      throw new Error('Failed to decrypt agent API key - encryption key may have changed')
    }
  }

  // No encrypted key exists, create a new one
  const apiKey = generateApiKey()
  const keyHash = await hashApiKey(apiKey)
  const keyPrefix = getKeyPrefix(apiKey)
  const encryptedKey = encrypt(apiKey)

  // Insert new API key with encrypted version
  const { data: newKey, error: insertError } = await supabase
    .from('api_keys')
    .insert({
      organization_id: organizationId,
      created_by: organizationId, // System-generated, use org ID as creator
      key_hash: keyHash,
      key_prefix: keyPrefix,
      encrypted_key: encryptedKey,
      name: AGENT_KEY_NAME,
      description: 'Auto-generated API key for hosted agent. Used server-side only.',
      permissions: {},
      metadata: {
        auto_generated: true,
        purpose: 'hosted_agent',
        created_at: new Date().toISOString(),
      },
      is_active: true,
    })
    .select('id')
    .single()

  if (insertError) {
    throw new Error(`Failed to create hosted agent API key: ${insertError.message}`)
  }

  console.log(`Created new hosted agent API key for organization ${organizationId}`)

  // Return the plain text API key (only used server-side!)
  return apiKey
}
