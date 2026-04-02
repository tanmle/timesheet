import { createClient } from '@/utils/supabase/server'
import styles from './page.module.css'
import Link from 'next/link'
import { deletePayrollRun } from './actions'

export const dynamic = 'force-dynamic'

export default async function PayrollDashboardPage() {
  const supabase = await createClient()

  // Parallelize payroll runs + unpaid entries fetch
  const [runsRes, unpaidRes] = await Promise.all([
    supabase
      .from('payroll')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('time_entries')
      .select('duration_minutes, profiles(hourly_rate, exchange_rate)')
      .eq('is_paid', false),
  ])

  const runs = runsRes.data || []
  const unpaidEntries = unpaidRes.data || []
  const pendingPayroll = runs.find(r => r.status === 'draft')

  let unbilledHours = 0
  let unbilledAmountVND = 0
  unpaidEntries.forEach((entry: any) => {
    unbilledHours += (entry.duration_minutes / 60)
    const rate = entry.profiles?.hourly_rate || 0
    const exRate = entry.profiles?.exchange_rate || 25000
    unbilledAmountVND += (entry.duration_minutes / 60) * rate * exRate
  })

  return (
    <>
      <div style={{ marginBottom: 'var(--space-6)' }} className="animate-fade-in-up">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Payroll History</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Track and manage your organization's payouts.</p>
      </div>

      {/* Hero Action Card */}
      <section className={`${styles.heroCard} glass-card-elevated animate-fade-in-up delay-1`} aria-label="Current payroll status">
        <div className={styles.heroTop}>
          <div className={styles.heroInfo}>
            <h2 className={styles.heroTitle}>{pendingPayroll ? pendingPayroll.month_name : 'Current Period'}</h2>
            <span className={`badge ${styles.badgeDraft}`}>Requires Action</span>
          </div>
          <p className={styles.heroSubtitle}>Unbilled hours are awaiting processing.</p>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.mainStat}>
            <span className={styles.statAmount} style={{ fontSize: '2.5rem' }}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(unbilledAmountVND)}
            </span>
          </div>
        </div>

        <Link href="/payroll/run" className={`btn btn-primary ${styles.heroBtn}`}>
          Generate Payroll
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'var(--space-2)' }}>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </section>

      {/* Quick Stats Grid */}
      <div className={`${styles.statsGrid} animate-fade-in-up delay-2`}>
        <div className={`glass-card ${styles.miniStat}`}>
          <p className="stat-label">Pending Total</p>
          <p className="stat-value accent" style={{ fontSize: '1.2rem' }}>
            {new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(unbilledAmountVND)}
          </p>
        </div>
        <div className={`glass-card ${styles.miniStat}`}>
          <p className="stat-label">Unbilled Hrs</p>
          <p className="stat-value">{unbilledHours.toFixed(1)}h</p>
        </div>
        <div className={`glass-card ${styles.miniStat}`}>
          <p className="stat-label">Last Paid</p>
          <p className="stat-value" style={{ color: 'var(--tertiary)' }}>{runs?.find(r => r.status === 'paid')?.month_name || 'N/A'}</p>
        </div>
      </div>

      {/* Past Payroll Runs */}
      <section className={`${styles.runsSection} animate-fade-in-up delay-3`}>
        <div className={styles.sectionHeader}>
          <h3>Previous Runs</h3>
        </div>
        <div className={styles.runsList}>
          {runs?.filter(r => r.status !== 'draft').length === 0 && (
            <p className="text-muted" style={{ padding: '1rem' }}>No past payroll runs.</p>
          )}
          {runs?.filter(r => r.status !== 'draft').map(run => (
            <div key={run.id} className={`glass-card ${styles.runCard}`}>
              <div className={styles.runLeft}>
                <div className={styles.runIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div>
                  <h4 className={styles.runName}>{run.month_name}</h4>
                  <p className={styles.runDetail}>{run.employee_count} Employees • {run.total_hours} hrs</p>
                </div>
              </div>
              <div className={styles.runRight} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ textAlign: 'right' }}>
                  <span className={styles.runTotal} style={{ display: 'block', marginBottom: '4px' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(run.total_amount)}
                  </span>
                  <span className={`badge ${run.status === 'paid' ? 'badge-success' : 'badge-info'}`}>{run.status}</span>
                </div>
                
                {/* Delete Payout History Button */}
                <form action={deletePayrollRun.bind(null, run.id)} style={{ margin: 0 }}>
                  <button 
                    type="submit" 
                    title="Delete Run" 
                    className={styles.deleteBtn}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
