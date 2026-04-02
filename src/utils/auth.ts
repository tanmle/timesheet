import { createClient } from '@/utils/supabase/server'

export type AuthResult = {
  user: { id: string; email?: string }
  role: string
}

/**
 * Verify the current user is authenticated and optionally require a specific role.
 * Throws if not authenticated or role requirement not met.
 */
export async function requireAuth(requiredRole?: 'admin'): Promise<AuthResult> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'

  if (requiredRole && role !== requiredRole) {
    throw new Error('Insufficient permissions')
  }

  return { user: { id: user.id, email: user.email ?? undefined }, role }
}
