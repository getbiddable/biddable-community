/**
 * Auth Helper Functions
 * Utilities for checking user permissions and roles
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Check if user is an internal employee (specific email only)
 * @param email - User's email address
 * @returns true if internal employee
 */
export function isInternalEmployee(email: string | null | undefined): boolean {
  if (!email) return false

  // Only allow this specific email
  const internalEmails = [
    'ops@getbiddable.com',
    // Add more internal emails here if needed
  ]

  return internalEmails.includes(email.toLowerCase())
}

/**
 * Check if current user is an internal employee
 * @returns Promise<boolean>
 */
export async function checkIsInternalEmployee(): Promise<boolean> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return false

  return isInternalEmployee(user.email)
}

/**
 * Check if user has admin role in their organization
 * @returns Promise<boolean>
 */
export async function checkIsOrgAdmin(): Promise<boolean> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return member?.role === 'admin'
}
