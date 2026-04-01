import { createClient } from '@/utils/supabase/server'
import styles from './page.module.css'
import { seedDemoData, signOut } from './actions'
import DeleteEntryButton from './components/DeleteEntryButton'
import { redirect } from 'next/navigation'

function StatusBadge({ status }: { status: 'completed' | 'in-progress' }) {
  const isCompleted = status === 'completed'
  return (
    <span className={`badge ${isCompleted ? 'badge-success' : 'badge-info'}`}>
      {isCompleted ? 'Paid' : 'Unpaid'}
    </span>
  )
}

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs > 0 && mins === 0) return `${hrs}h`
  if (hrs === 0) return `${mins}m`
  return `${hrs}h ${mins}m`
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get user profile
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/reports')
  }

  // Fetch active projects conditionally based on access
  let projects: any[] = []

  if (profile?.role === 'admin') {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
    projects = data || []
  } else {
    const assignedIds = profile?.projects || []
    if (assignedIds.length > 0) {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .in('id', assignedIds)
        .order('created_at', { ascending: false })
        .limit(3)
      projects = data || []
    }
  }

  // Fetch recent entries
  let recentEntriesQuery = supabase
    .from('time_entries')
    .select('*, projects(name), profiles(full_name)')
    .order('date', { ascending: false })
    .limit(3)

  if (profile?.role !== 'admin') {
    recentEntriesQuery = recentEntriesQuery.eq('user_id', user.id)
  }

  const { data: recentEntries = [] } = await recentEntriesQuery

  const hour = new Date().getHours()
  let greeting = 'Good Evening'
  if (hour < 12) greeting = 'Good Morning'
  else if (hour < 17) greeting = 'Good Afternoon'

  const formatYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  
  const startOfThisMonthStr = formatYMD(new Date(now.getFullYear(), now.getMonth(), 1))
  const startOfLastMonthStr = formatYMD(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const endOfLastMonthStr = formatYMD(new Date(now.getFullYear(), now.getMonth(), 0))
  const todayStr = formatYMD(now)

  let entriesQuery = supabase
    .from('time_entries')
    .select('project_id, date, duration_minutes')

  if (profile?.role !== 'admin') {
    entriesQuery = entriesQuery.eq('user_id', user.id)
  }

  const { data: allUserEntries = [] } = await entriesQuery

  let hoursToday = 0
  let hoursThisMonth = 0
  let hoursLastMonth = 0
  const projectHours: Record<string, number> = {}

  allUserEntries?.forEach(e => {
    const h = e.duration_minutes / 60

    // Calculate per-project totals for the user
    projectHours[e.project_id] = (projectHours[e.project_id] || 0) + h

    // Calculate recent stats (filter correctly)
    if (e.date === todayStr) hoursToday += h
    if (e.date >= startOfThisMonthStr) hoursThisMonth += h
    if (e.date >= startOfLastMonthStr && e.date <= endOfLastMonthStr) hoursLastMonth += h
  })

  // Dynamic stats calculation
  const QUICK_STATS = [
    { label: 'Hours Today', value: hoursToday.toFixed(1), unit: 'hrs', trend: '' },
    { label: 'This Month', value: hoursThisMonth.toFixed(1), unit: 'hrs', trend: '' },
    { label: 'Last Month', value: hoursLastMonth.toFixed(1), unit: 'hrs', trend: '' },
  ]

  const projectColors = ['#9fa7ff', '#be83fa', '#48e5d0']

  return (
    <div className="container">
      {(!projects || projects.length === 0) && (
        <div className="glass-card animate-fade-in-up delay-1" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)', textAlign: 'center' }}>
          <p style={{ marginBottom: 'var(--space-4)', color: 'var(--on-surface-variant)' }}>
            Your dashboard is empty. Let's add some sample data to see how everything looks!
          </p>
          <form action={seedDemoData}>
            <button className="btn btn-primary">Seed Demo Data</button>
          </form>
        </div>
      )}

      {/* Quick Stats */}
      <section className={`${styles.statsGrid} animate-fade-in-up delay-1`} aria-label="Quick statistics">
        {QUICK_STATS.map((stat) => (
          <div key={stat.label} className={`glass-card ${styles.statCard}`}>
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value accent">{stat.value}</p>
            <p className={styles.statUnit}>{stat.unit}</p>
          </div>
        ))}
      </section>

      {/* Active Projects */}
      <section className={`animate-fade-in-up delay-3`} aria-label="projects">
        <div className={styles.sectionHeader}>
          <h3>Projects</h3>
          <button className="btn btn-ghost" id="view-all-projects">View All</button>
        </div>
        <div className={styles.projectsList}>
          {projects?.map((project, index) => {
            const userHours = projectHours[project.id] || 0
            const color = projectColors[index % projectColors.length]
            return (
              <div key={project.id} className={`glass-card ${styles.projectCard}`}>
                <div className={styles.projectInfo}>
                  <div className={styles.projectDot} style={{ background: color }} />
                  <div style={{ flex: 1 }}>
                    <span className={styles.projectName} style={{ display: 'block' }}>{project.name}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--outline)' }}>{profile?.role === 'admin' ? 'Total logged' : 'Total logged by you'}</span>
                  </div>
                  <span className={styles.projectPercent} style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                    {userHours.toFixed(1)}h
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Recent Entries */}
      <section className={`animate-fade-in-up delay-4`} aria-label="Recent time entries">
        <div className={styles.sectionHeader}>
          <h3>Recent Entries</h3>
          <button className="btn btn-ghost" id="view-all-entries">View All</button>
        </div>
        <div className={styles.entriesList}>
          {recentEntries?.map((entry) => (
            <div key={entry.id} className={`glass-card ${styles.entryCard}`}>
              <div className={styles.entryTop}>
                <div>
                  <p className={styles.entryProject}>{(entry.projects as any)?.name || 'Unknown Project'}</p>
                  <p className={styles.entryTask}>
                    {profile?.role === 'admin' && (entry.profiles as any)?.full_name
                      ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{(entry.profiles as any).full_name.split(' ')[0]}: </span>
                      : null
                    }
                    {entry.task_description}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusBadge status={entry.is_paid ? 'completed' : 'in-progress'} />
                  {!entry.is_paid && <DeleteEntryButton entryId={entry.id} />}
                </div>
              </div>
              <div className={styles.entryBottom}>
                <span className={styles.entryTime}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {(() => {
                    const [y, m, d] = entry.date.split('-').map(Number)
                    return new Date(y, m - 1, d).toLocaleDateString()
                  })()}
                </span>
                <span className={styles.entryHours}>{formatDuration(entry.duration_minutes)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
