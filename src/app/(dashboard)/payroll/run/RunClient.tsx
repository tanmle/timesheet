'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Link from 'next/link'
import { toggleEntryPaidStatus, processEmployeePayroll } from './actions'
import ModalOverlay from '@/components/ModalOverlay'

type Profile = {
  id: string
  full_name: string
  avatar_url: string | null
  hourly_rate: number
  exchange_rate: number
  bank_name: string | null
  bank_number: string | null
}

type EmployeeData = {
  profile: Profile
  totalHours: number
  totalAmountUSD: number
  totalAmountVND: number
  entries: any[]
}

export default function RunClient({ 
  employeeDataObj,
  initialParams
}: { 
  employeeDataObj: Record<string, EmployeeData>,
  initialParams?: { user_id?: string, month?: string, year?: string }
}) {
  const router = useRouter()
  const [payingEmpId, setPayingEmpId] = useState<string | null>(null)
  
  // Track selected IDs for all entries across all employees
  const allInitialIds = Object.values(employeeDataObj).flatMap(emp => emp.entries.map(e => e.id))
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set(allInitialIds))

  const employeeData = Object.values(employeeDataObj)

  const handlePayClick = (empId: string) => {
    setPayingEmpId(empId)
  }

  const closePayModal = () => {
    setPayingEmpId(null)
  }

  const toggleEntry = (id: string) => {
    const next = new Set(selectedEntryIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedEntryIds(next)
  }

  const handleMarkAsPaid = async (empId: string) => {
    const emp = employeeDataObj[empId]
    if (!emp) return
    
    const toastId = toast.loading(`Processing payroll for ${emp.profile.full_name}...`)
    
    try {
      // Filter the employee's entries by the global selection state
      const selectedForThisEmp = emp.entries.filter(e => selectedEntryIds.has(e.id))
      const entryIds = selectedForThisEmp.map(e => e.id)
      
      if (entryIds.length === 0) {
        toast.error('No entries selected for this payout.', { id: toastId })
        return
      }

      // Calculate the specific total for selected items
      let selectedTotalVND = 0
      let selectedTotalHours = 0
      selectedForThisEmp.forEach(entry => {
        const hrs = entry.duration_minutes / 60
        const usdRate = emp.profile.hourly_rate || 0
        const xRate = entry.projects?.exchange_rate || emp.profile.exchange_rate || 25000
        selectedTotalVND += (hrs * usdRate) * xRate
        selectedTotalHours += hrs
      })

      await processEmployeePayroll(
        emp.profile.id,
        emp.profile.full_name,
        selectedTotalHours,
        selectedTotalVND,
        entryIds
      )
      
      toast.success(`Payroll processed for ${emp.profile.full_name}`, { id: toastId })
      closePayModal()
      router.refresh()
    } catch (error) {
      toast.error('Failed to process payment. Please try again.', { id: toastId })
      console.error(error)
    }
  }

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      {/* Header */}
      <header className={`${styles.header} animate-fade-in-up`}>
        <div className={styles.headerTop} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className={styles.titleWrap} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <Link href="/payroll" className={styles.backBtn} aria-label="Back" style={{ color: 'var(--on-surface)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </Link>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Run Payroll</h1>
          </div>
        </div>
        <p className="text-muted" style={{ marginLeft: 'var(--space-10)', marginTop: 'var(--space-2)' }}>Review and process payouts securely.</p>
      </header>
      
      {employeeData.length === 0 && (
         <div className="glass-card animate-fade-in-up delay-1" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
            <p className="text-muted">No unbilled time entries found.</p>
         </div>
      )}

      {/* Employee List */}
      <div className={`${styles.employeeList} animate-fade-in-up delay-1`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {employeeData.map((emp) => {
          const initials = (emp.profile.full_name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2)
          
          // Calculate filtered summary for this employee
          const selectedEntries = emp.entries.filter(e => selectedEntryIds.has(e.id))
          let currentTotalVND = 0
          let currentTotalHours = 0
          selectedEntries.forEach(entry => {
            const hrs = entry.duration_minutes / 60
            const usdRate = emp.profile.hourly_rate || 0
            const xRate = entry.projects?.exchange_rate || emp.profile.exchange_rate || 25000
            currentTotalVND += (hrs * usdRate) * xRate
            currentTotalHours += hrs
          })

          return (
            <div key={emp.profile.id} className={`glass-card ${styles.employeeCard}`} style={{ padding: 'var(--space-5)' }}>
              <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                <div className={styles.employeeInfo} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                  <div className={styles.avatar} style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, #be83fa 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem' }}>
                    <span>{initials}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 className={styles.employeeName} style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>{emp.profile.full_name}</h2>
                      {initialParams?.user_id === emp.profile.id && (
                        <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#FACC15', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                          Request Target
                        </span>
                      )}
                    </div>
                    <p className={styles.employeeRole} style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                      Selected: <strong style={{ color: 'var(--on-surface)' }}>{currentTotalHours.toFixed(1)}h</strong> ({selectedEntries.length} items)
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <span className={styles.totalAmount} style={{ fontSize: '1.5rem', fontWeight: 800, color: currentTotalVND > 0 ? 'var(--primary)' : 'var(--outline)' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentTotalVND)}
                  </span>
                  <button 
                    onClick={() => handlePayClick(emp.profile.id)} 
                    className="btn btn-primary btn-sm" 
                    style={{ padding: '6px 20px' }}
                    disabled={currentTotalVND === 0}
                  >
                    Pay Selected
                  </button>
                </div>
              </div>

              {/* Individual Entries Breakdown with Checkboxes */}
              <div className={styles.entriesBreakdown} style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                {emp.entries.map((entry) => (
                  <label key={entry.id} className={styles.breakdownRow} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedEntryIds.has(entry.id)} 
                      onChange={() => toggleEntry(entry.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', gap: '12px', color: selectedEntryIds.has(entry.id) ? 'var(--on-surface)' : 'var(--outline)' }}>
                        <span style={{ minWidth: '80px', fontWeight: 600 }}>
                          {(() => {
                            const [y, m, d] = entry.date.split('-').map(Number)
                            return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          })()}
                        </span>
                        <span>{entry.task_description}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: selectedEntryIds.has(entry.id) ? 'var(--primary)' : 'var(--outline)' }}>
                        {entry.duration_minutes / 60}h
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Payment Modal */}
      {payingEmpId && (() => {
        const emp = employeeDataObj[payingEmpId]
        const selectedForThisEmp = emp.entries.filter(e => selectedEntryIds.has(e.id))
        let selectedTotalVND = 0
        selectedForThisEmp.forEach(entry => {
          const hrs = entry.duration_minutes / 60
          const usdRate = emp.profile.hourly_rate || 0
          const xRate = entry.projects?.exchange_rate || emp.profile.exchange_rate || 25000
          selectedTotalVND += (hrs * usdRate) * xRate
        })

        return (
          <ModalOverlay onClose={closePayModal}>
            <div style={{
              background: '#0F172A',
              width: '100%',
              maxWidth: '420px',
              borderRadius: '24px',
              padding: 'var(--space-6)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }} className="animate-fade-in-up">
              
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Scan to Pay {emp.profile.full_name}</h3>
              
              <p style={{ margin: '0 0 var(--space-6) 0', color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
                Amount Due ({selectedForThisEmp.length} items): <br/>
                <strong style={{ color: 'var(--primary)', fontSize: '1.4rem' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedTotalVND)}</strong>
              </p>

              {emp.profile.bank_name && emp.profile.bank_number ? (
                <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', marginBottom: 'var(--space-6)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={`https://img.vietqr.io/image/${emp.profile.bank_name}-${emp.profile.bank_number}-compact2.png?amount=${selectedTotalVND}&addInfo=Payroll%20Payout`} 
                    alt="VietQR code" 
                    style={{ width: '250px', height: '250px', display: 'block' }}
                  />
                </div>
              ) : (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: 'var(--space-6)', borderRadius: '16px', marginBottom: 'var(--space-6)', width: '100%' }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>Missing Bank Details</p>
                  <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0', opacity: 0.8 }}>This employee has not linked a valid bank account for VietQR processing.</p>
                </div>
              )}

              <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', marginBottom: 'var(--space-6)', textAlign: 'left', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Bank Name</span>
                  <strong style={{ color: 'var(--on-surface)' }}>{emp.profile.bank_name || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Account Number</span>
                  <strong style={{ color: 'var(--on-surface)' }}>{emp.profile.bank_number || 'N/A'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', width: '100%' }}>
                <button type="button" onClick={closePayModal} style={{ flex: 1, minHeight: '44px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>Cancel</button>
                <form action={() => handleMarkAsPaid(payingEmpId)} style={{ flex: 1, margin: 0 }}>
                  <button type="submit" style={{ width: '100%', minHeight: '44px', borderRadius: '12px', background: '#2563EB', color: '#fff', fontSize: '0.95rem', fontWeight: 700, border: 'none' }}>Mark As Paid</button>
                </form>
              </div>
            </div>
          </ModalOverlay>
        )
      })()}

    </div>
  )
}
