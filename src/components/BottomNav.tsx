'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './BottomNav.module.css'

type NavItem = {
  href: string;
  label: string;
  icon: string;
  isAction?: boolean;
}

const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/payroll', label: 'Payroll', icon: 'payroll' },
  { href: '/reports', label: 'Reports', icon: 'reports' },
  { href: '/projects', label: 'Projects', icon: 'folder' },
  { href: '/team', label: 'Team', icon: 'team' },
] as const

const USER_NAV_ITEMS: readonly NavItem[] = [
  { href: '/add', label: 'Timesheet', icon: 'schedule' },
  { href: '/reports', label: 'Report', icon: 'reports' },
] as const

function NavIcon({ name, isAction }: { name: string; isAction?: boolean }) {
  const iconMap: Record<string, React.ReactNode> = {
    home: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    schedule: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    add_circle: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
    folder: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
    team: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    payroll: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    reports: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  }
  return iconMap[name] ? <>{iconMap[name]}</> : null
}

type BottomNavProps = {
  role: string
}

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const navItems = role === 'admin' ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS

  return (
    <nav className={styles.nav} id="bottom-navigation">
      <div className={styles.navInner}>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''} ${item.isAction ? styles.actionItem : ''}`}
              id={`nav-${item.label.toLowerCase()}`}
            >
              <span className={styles.iconWrap}>
                <NavIcon name={item.icon} isAction={item.isAction} />
              </span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
