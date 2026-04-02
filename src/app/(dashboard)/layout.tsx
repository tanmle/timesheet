import BottomNav from '@/components/BottomNav'
import styles from './AppShell.module.css'
import { getAuthUser } from '@/utils/getAuthUser'

import GlobalHeader from './Header'

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()
  const role = user?.role || 'user'

  return (
    <div className={styles.shell}>
      <main className={styles.main} id="main-content">
        <div className="container animate-fade-in">
          <GlobalHeader />
          {children}
        </div>
      </main>
      <BottomNav role={role} />
    </div>
  )
}
