import BottomNav from '@/components/BottomNav'
import styles from './AppShell.module.css'
import { createClient } from '@/utils/supabase/server'

import GlobalHeader from './Header'

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  let role = 'user'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    role = profile?.role || 'user'
  }

  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <div className="container animate-fade-in">
          <GlobalHeader />
          {children}
        </div>
      </main>
      <BottomNav role={role} />
    </div>
  )
}
