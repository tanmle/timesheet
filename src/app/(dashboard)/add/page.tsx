import { createClient } from '@/utils/supabase/server'
import { getAuthUser } from '@/utils/getAuthUser'
import styles from './page.module.css'
import MonthlyTimesheetForm from './MonthlyTimesheetForm'

export default async function AddPage() {
  const user = await getAuthUser()
  if (!user) return null

  const supabase = await createClient()

  // Fetch profile projects + time entries in parallel
  const projectIds = user.projects || []

  const [projectsRes, entriesRes] = await Promise.all([
    projectIds.length > 0
      ? supabase
          .from('projects')
          .select('*')
          .in('id', projectIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
    supabase
      .from('time_entries')
      .select('date, duration_minutes, project_id, is_paid')
      .eq('user_id', user.id),
  ])

  const activeProjects = projectsRes.data || []
  const timeEntries = entriesRes.data || []

  return (
    <>
      <div style={{ marginBottom: 'var(--space-6)' }} className="animate-fade-in-up">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Timesheet</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Log your time across active projects.</p>
      </div>
      
      <MonthlyTimesheetForm 
        projects={activeProjects} 
        entries={timeEntries} 
        month={new Date().getMonth()} 
        year={new Date().getFullYear()} 
      />
    </>
  )
}
