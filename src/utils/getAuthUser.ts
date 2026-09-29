import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'

export type UserProfile = {
  id: string
  email?: string
  full_name?: string
  role: string
  projects?: string[]
  hourly_rate?: number
  exchange_rate?: number
  pricing_type?: string
  fixed_salary?: number
  employment_type?: string
}

/**
 * Cached auth + profile fetch. Deduplicates across components in a single render pass.
 * Returns null if not authenticated.
 */
export const getAuthUser = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, projects, hourly_rate, exchange_rate, pricing_type, fixed_salary, employment_type')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email ?? undefined,
    full_name: profile?.full_name ?? undefined,
    role: profile?.role || 'user',
    projects: profile?.projects ?? undefined,
    hourly_rate: profile?.hourly_rate ?? undefined,
    exchange_rate: profile?.exchange_rate ?? undefined,
    pricing_type: profile?.pricing_type ?? undefined,
    fixed_salary: profile?.fixed_salary ?? undefined,
    employment_type: profile?.employment_type ?? undefined,
  }
})
