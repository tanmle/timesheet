import { createClient } from '@/utils/supabase/server'
import styles from './page.module.css'
import MonthlyTimesheetForm from './MonthlyTimesheetForm'

export default async function AddPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch projects user is assigned to
  const { data: profile } = await supabase.from('profiles').select('projects').eq('id', user.id).single()
  const projectIds = profile?.projects || []

  const { data: activeProjects = [] } = await supabase
    .from('projects')
    .select('*')
    .in('id', projectIds)
    .eq('status', 'active')

  const { data: timeEntries = [] } = await supabase
    .from('time_entries')
    .select('date, duration_minutes, project_id, is_paid')
    .eq('user_id', user.id)

  return (
    <>
      <div style={{ marginBottom: 'var(--space-6)' }} className="animate-fade-in-up">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Timesheet</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Log your time across active projects.</p>
      </div>
      
      <MonthlyTimesheetForm projects={activeProjects || []} entries={timeEntries || []} />
    </>
  )
}
