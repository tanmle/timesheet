import { createClient } from '@/utils/supabase/server'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const supabase = await createClient()

  // Parallelize team members + projects fetch
  const [membersRes, projectsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')
      .order('full_name'),
    supabase
      .from('projects')
      .select('id, name')
      .order('name'),
  ])

  const teamMembers = membersRes.data || []
  const projects = projectsRes.data || []

  return <TeamClient teamMembers={teamMembers} projects={projects} />
}

