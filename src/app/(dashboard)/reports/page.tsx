import { createClient } from '@/utils/supabase/server'
import { getAuthUser } from '@/utils/getAuthUser'
import ReportClient from './ReportClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const user = await getAuthUser()
  if (!user) return null

  const isAdmin = user.role === 'admin'
  const supabase = await createClient()

  // Parallelize projects + profiles fetch
  const projectsPromise = isAdmin
    ? supabase.from('projects').select('id, name').order('name')
    : (user.projects && user.projects.length > 0
        ? supabase.from('projects').select('id, name').in('id', user.projects).order('name')
        : Promise.resolve({ data: [] }))

  const profilesPromise = isAdmin
    ? supabase.from('profiles').select('id, full_name').order('full_name')
    : Promise.resolve({ data: [] })

  const [projectsRes, profilesRes] = await Promise.all([projectsPromise, profilesPromise])

  const projects = projectsRes.data || []
  const filteredProfiles = isAdmin
    ? (profilesRes.data || []).filter(p => p.id !== user.id)
    : []
  
  return <ReportClient initialProjects={projects} initialProfiles={filteredProfiles} isAdmin={isAdmin} />
}
