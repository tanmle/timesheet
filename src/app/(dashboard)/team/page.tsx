import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Fetch all profiles from Supabase (excluding admins)
  const { data: teamMembers = [] } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'admin')
    .order('full_name')

  // Fetch all projects for the multiselect
  const { data: projects = [] } = await supabase
    .from('projects')
    .select('id, name')
    .order('name')

  return <TeamClient teamMembers={teamMembers || []} projects={projects || []} />
}

