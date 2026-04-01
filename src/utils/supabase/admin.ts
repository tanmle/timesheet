import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client using the service role key.
 * This bypasses RLS — only use in server-side code (server actions, API routes).
 * NEVER import this in client components.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
