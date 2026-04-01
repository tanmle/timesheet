import { createClient } from '@/utils/supabase/server'
import ReportClient from './ReportClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Get current profile to check role and project access
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  // 2. Fetch projects conditionally
  let projects: any[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .order('name')
    projects = data || []
  } else {
    const assignedIds = profile?.projects || []
    if (assignedIds.length > 0) {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', assignedIds)
        .order('name')
      projects = data || []
    }
  }

  // 3. Fetch profiles (Only for Admin)
  const { data: initialProfiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name')

  const filteredProfiles = (isAdmin && initialProfiles) ? initialProfiles.filter(p => p.id !== user?.id) : []
  
  return (
    <div className="container">
      <ReportClient initialProjects={projects} initialProfiles={filteredProfiles} isAdmin={isAdmin} />
    </div>
  )
}
