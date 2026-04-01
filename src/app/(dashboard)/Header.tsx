import { createClient } from '@/utils/supabase/server'
import { signOut } from './actions'
import styles from './page.module.css'

export default async function GlobalHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const hour = new Date().getHours()
  let greeting = 'Good Evening'
  if (hour < 12) greeting = 'Good Morning'
  else if (hour < 17) greeting = 'Good Afternoon'

  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const initial = profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || '?'
  const firstName = profile?.full_name?.split(' ')[0] || 'User'

  return (
    <header className={`${styles.header} animate-fade-in-up`} style={{ marginBottom: 'var(--space-4)' }}>
      <div className={styles.headerTop}>
        <div>
          <p className={styles.greeting}>{greeting}</p>
          <h1 className={styles.userName}>{firstName}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <form action={signOut}>
            <button type="submit" className="btn-icon" style={{ color: 'var(--error)' }} aria-label="Sign Out" title="Sign Out">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </form>
          <div className={styles.avatar} id="user-avatar">
            <span>{initial}</span>
          </div>
        </div>
      </div>
      <p className={styles.date}>{currentDate}</p>
    </header>
  )
}
