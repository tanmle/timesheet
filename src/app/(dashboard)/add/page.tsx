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
    <div className="container">
      {/* Header */}
      <header className={`${styles.header} animate-fade-in-up`}>
        <h1>Timesheet</h1>
        <p className="text-muted">Log your time across active projects.</p>
      </header>
      
      {/* Render new Monthly Timesheet Form Experience */}
      <MonthlyTimesheetForm projects={activeProjects || []} entries={timeEntries || []} />
    </div>
  )
}
