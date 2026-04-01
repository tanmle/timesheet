'use client'

import { useState, useEffect } from 'react'
import { getReportData } from './actions'
import styles from './page.module.css'
import DeleteEntryButton from '../components/DeleteEntryButton'

type Entry = {
  id: string;
  date: string;
  duration_minutes: number;
  task_description: string;
  is_paid: boolean;
  profiles: { full_name: string; hourly_rate: number; exchange_rate: number };
  projects: { name: string; rate: number; exchange_rate: number };
}

export default function ReportClient({ initialProjects, initialProfiles, isAdmin }: { initialProjects: any[], initialProfiles: any[], isAdmin: boolean }) {
  const [selectedProject, setSelectedProject] = useState('all')
  const [selectedUser, setSelectedUser] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [entries, setEntries] = useState<Entry[]>([])
  const [payrolls, setPayrolls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const fetchReport = async () => {
    setLoading(true)
    const response = await getReportData(selectedProject, isAdmin ? selectedUser : 'all', selectedMonth, selectedYear)
    if (response.success) {
      setEntries(response.data as any)
      setPayrolls(response.payrolls || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReport()
  }, [selectedProject, selectedUser, selectedMonth, selectedYear])

  // Formatting Helper
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Calculations (In VND)
  const totalRevenue = entries.reduce((acc, e) => {
    const xRate = e.projects?.exchange_rate || e.profiles?.exchange_rate || 25000
    return acc + (e.duration_minutes / 60 * (e.projects?.rate || 0) * xRate)
  }, 0)

  const totalEarnings = entries.reduce((acc, e) => {
    const xRate = e.projects?.exchange_rate || e.profiles?.exchange_rate || 25000
    return acc + (e.duration_minutes / 60 * (e.profiles?.hourly_rate || 0) * xRate)
  }, 0)

  const paidEarnings = entries.filter(e => e.is_paid).reduce((acc, e) => {
    const xRate = e.projects?.exchange_rate || e.profiles?.exchange_rate || 25000
    return acc + (e.duration_minutes / 60 * (e.profiles?.hourly_rate || 0) * xRate)
  }, 0)

  const pendingEarnings = totalEarnings - paidEarnings
  const totalHours = entries.reduce((acc, e) => acc + (e.duration_minutes / 60), 0)
  const totalProfit = totalRevenue - totalEarnings

  return (
    <div style={{ paddingBottom: '100px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }} className="animate-fade-in-up">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Reports</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Analyze your project economics and earnings.</p>
      </div>

      {/* Hero Stats (Total, Paid, Pending) */}
      <div className="glass-card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
           <div>
              <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>YEAR</label>
                <select 
                  className="input-field" 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  <option value="0">Life Time</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
           </div>
           <div>
              <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>MONTH</label>
                <select 
                  className="input-field" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  disabled={selectedYear === 0}
                  style={{ opacity: selectedYear === 0 ? 0.4 : 1 }}
                >
                  <option value="0">All Months</option>
                  {months.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                </select>
           </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: 'var(--space-4)' }}>
          <div>
            <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>PROJECT</label>
            <select 
              className="input-field" 
              value={selectedProject} 
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="all">Every Project</option>
              {initialProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {isAdmin && (
            <div>
              <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>USER</label>
              <select 
                className="input-field" 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="all">Every User</option>
                {initialProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
         <div className="glass-card" style={{ padding: 'var(--space-4)', borderRadius: '20px' }}>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>{isAdmin ? 'TOTAL REVENUE' : 'TOTAL EARNINGS'}</p>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981', margin: 0 }}>{formatVND(isAdmin ? totalRevenue : totalEarnings)}</h2>
         </div>
         <div className="glass-card" style={{ padding: 'var(--space-4)', borderRadius: '20px' }}>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>{isAdmin ? 'TOTAL PAID' : 'PAID EARNINGS'}</p>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B', margin: 0 }}>{formatVND(isAdmin ? totalEarnings : paidEarnings)}</h2>
         </div>
         <div className="glass-card" style={{ padding: 'var(--space-4)', borderRadius: '20px' }}>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>TOTAL HOURS</p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--on-surface)', margin: 0 }}>{totalHours.toFixed(1)}h</h2>
         </div>
         <div className="glass-card" style={{ padding: 'var(--space-4)', borderRadius: '20px' }}>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>{isAdmin ? 'NET PROFIT' : 'PENDING PAYOUT'}</p>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8B5CF6', margin: 0 }}>{formatVND(isAdmin ? totalProfit : pendingEarnings)}</h2>
         </div>
      </div>

      {/* Details List */}
      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--outline)', letterSpacing: '0.06em', marginBottom: 'var(--space-4)' }}>WORK LOGS</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
        {loading ? (
          <p className="text-muted">Analyzing work logs...</p>
        ) : entries.length === 0 ? (
          <div className="glass-card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <p className="text-muted">No records found for this period.</p>
          </div>
        ) : (
          entries.map(entry => {
            const entryHours = entry.duration_minutes / 60
            const xRate = entry.projects?.exchange_rate || entry.profiles?.exchange_rate || 25000
            const entryRevenue = entryHours * (entry.projects?.rate || 0) * xRate
            const entryEarnings = entryHours * (entry.profiles?.hourly_rate || 0) * xRate
            return (
              <div key={entry.id} className="glass-card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {(() => {
                        const [y, m, d] = entry.date.split('-').map(Number)
                        return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      })()}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#3B82F6', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>{entry.projects?.name}</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.8125rem', margin: 0 }}>{entry.task_description.length > 50 ? entry.task_description.substring(0, 50) + '...' : entry.task_description}</p>
                  {isAdmin && (
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--outline)' }}>{entry.profiles?.full_name}</span>
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{entryHours.toFixed(1)}h</p>
                    {!entry.is_paid && <DeleteEntryButton entryId={entry.id} onSuccess={fetchReport} />}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: entry.is_paid ? '#10B981' : '#F59E0B', fontWeight: 700 }}>{formatVND(isAdmin ? entryRevenue : entryEarnings)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Payout History Section */}
      {!isAdmin && payrolls.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--outline)', letterSpacing: '0.06em', marginBottom: 'var(--space-4)' }}>PAYOUT HISTORY</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {payrolls.map(pay => (
              <div key={pay.id} className="glass-card" style={{ padding: 'var(--space-4)', borderLeft: '4px solid #10B981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{pay.month_name}</h4>
                  <p className="text-muted" style={{ fontSize: '0.75rem', margin: '4px 0 0 0' }}>
                    Successfully processed on {new Date(pay.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 800, color: '#10B981', margin: 0 }}>{formatVND(pay.total_amount)}</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>{pay.total_hours}h total</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
