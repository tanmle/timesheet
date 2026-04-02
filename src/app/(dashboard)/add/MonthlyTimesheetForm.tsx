'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import styles from './page.module.css'
import DurationPicker from './DurationPicker'
import { addTimeEntry, deleteTimeEntries, requestPayment } from './actions'
import { createClient } from '@/utils/supabase/client'

type Project = { id: string, name: string }
type TimeEntry = { date: string, duration_minutes: number, project_id: string, is_paid: boolean }

interface MonthlyTimesheetFormProps {
  projects: Project[]
  entries: TimeEntry[]
  month: number
  year: number
}

export default function MonthlyTimesheetForm({ 
  projects, 
  entries: initialEntries, 
  month: initialMonth, 
  year: initialYear 
}: MonthlyTimesheetFormProps) {
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [currentEntries, setCurrentEntries] = useState<TimeEntry[]>(initialEntries)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '')
  const supabase = createClient()

  // 1. Real-time Synchronization EFFECT
  useEffect(() => {
    const syncData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Specific channel for THIS user to avoid global noise
      const channel = supabase
        .channel(`timesheet-sync-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen for any changes (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'time_entries',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('🔄 Realtime Sync Triggered:', payload.eventType)
            
            // Re-fetch current month's data to ensure absolute accuracy
            const firstDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
            const lastDay = new Date(year, month + 1, 0).getDate()
            const lastDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
            
            const { data } = await supabase
              .from('time_entries')
              .select('*')
              .eq('user_id', user.id)
              .gte('date', firstDate)
              .lte('date', lastDate)
            
            if (data) {
              setCurrentEntries(data as TimeEntry[])
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Sync Channel Status:', status)
        })

      return channel
    }

    const channelPromise = syncData()
    return () => {
      channelPromise.then(c => c && supabase.removeChannel(c))
    }
  }, [month, year, supabase])

  // Sync state if initialEntries prop changes (e.g. on first load)
  useEffect(() => {
    setCurrentEntries(initialEntries)
  }, [initialEntries])

  // Calendar logic helpers
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  // Group entries for rendering
  const hoursByDate: Record<string, number> = {}
  const paidByDate = new Set<string>()

  currentEntries.forEach(e => {
    if (e.project_id === selectedProjectId) {
      hoursByDate[e.date] = (hoursByDate[e.date] || 0) + (e.duration_minutes / 60)
      if (e.is_paid) paidByDate.add(e.date)
    }
  })

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
    setSelectedDates([])
    setIsModalOpen(false)
  }

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
    setSelectedDates([])
    setIsModalOpen(false)
  }

  const [isDragging, setIsDragging] = useState(false)

  // Drag listeners
  useEffect(() => {
    const handleUp = () => setIsDragging(false)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('touchend', handleUp)
    }
  }, [])

  const handlePointerDown = (dateStr: string, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    if (paidByDate.has(dateStr)) {
      toast.info('This record is already paid.')
      return
    }
    e.target && (e.target as HTMLElement).releasePointerCapture(e.pointerId)
    setIsDragging(true)
    setSelectedDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr])
    setIsModalOpen(true)
  }

  const handlePointerEnter = (dateStr: string) => {
    if (isDragging && !paidByDate.has(dateStr)) {
      setSelectedDates(prev => !prev.includes(dateStr) ? [...prev, dateStr] : prev)
    }
  }

  const hasLoggedTimeInSelection = selectedDates.some(d => (hoursByDate[d] || 0) > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Project Selection */}
      <section className="animate-fade-in-up">
        <label className="input-label" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>1. SELECT PROJECT</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          {projects.map((project) => {
            const isSelected = selectedProjectId === project.id
            return (
              <label key={project.id} className={styles.projectRadio} style={{ margin: 0 }}>
                <input type="radio" name="project_id" value={project.id} checked={isSelected} onChange={() => { setSelectedProjectId(project.id); setSelectedDates([]); setIsModalOpen(false) }} className="sr-only" required />
                <div style={{ 
                  padding: '10px 20px', borderRadius: '100px', 
                  border: isSelected ? '2px solid #2563EB' : '1px solid rgba(255,255,255,0.1)', 
                  background: isSelected ? 'rgba(37,99,235,0.1)' : 'var(--surface)', 
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: isSelected ? '4px solid #2563EB' : '1px solid rgba(255,255,255,0.3)' }} />
                  <span style={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? '#fff' : 'var(--on-surface-variant)' }}>{project.name}</span>
                </div>
              </label>
            )
          })}
        </div>
      </section>

      {/* 2. Calendar Grid */}
      <section className="glass-card-elevated animate-fade-in-up delay-1" style={{ padding: 'var(--space-5)', opacity: selectedProjectId ? 1 : 0.5, pointerEvents: selectedProjectId ? 'auto' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>2. TAP DAYS TO LOG TIME</p>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '4px 12px', borderRadius: '100px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <span style={{ color: '#60A5FA', fontWeight: 700, fontSize: '0.85rem' }}>
              {(() => {
                const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
                let total = 0, paid = 0
                currentEntries.forEach(e => {
                  if (e.project_id === selectedProjectId && e.date.startsWith(monthStr)) {
                    total += e.duration_minutes / 60
                    if (e.is_paid) paid += e.duration_minutes / 60
                  }
                })
                return `${paid.toFixed(1)}h / ${total.toFixed(1)}h paid`
              })()}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
           <button type="button" onClick={handlePrevMonth} className="btn-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
           <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{monthNames[month]} {year}</h2>
           <button type="button" onClick={handleNextMonth} className="btn-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-2)', textAlign: 'center', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 'var(--space-3)', fontSize: '0.85rem' }}>
          <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-2)', touchAction: 'none' }}>
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === new Date().toISOString().split('T')[0]
            const isSelected = selectedDates.includes(dateStr)
            const isLastSelected = selectedDates[selectedDates.length - 1] === dateStr
            const loggedHours = hoursByDate[dateStr] || 0
            const isPaidDay = paidByDate.has(dateStr)

            return (
              <div key={idx} style={{ position: 'relative' }}>
                <button type="button" onPointerDown={(e) => handlePointerDown(dateStr, e)} onPointerEnter={() => handlePointerEnter(dateStr)}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: '12px',
                    border: isToday ? '2px solid #2563EB' : (isSelected ? '2px solid #3B82F6' : (isPaidDay ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent')),
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : (isPaidDay ? 'rgba(16, 185, 129, 0.08)' : (isToday ? 'transparent' : 'var(--surface)')),
                    color: isSelected ? '#60A5FA' : (isToday ? '#2563EB' : (isPaidDay ? '#10B981' : 'inherit')),
                    fontWeight: isToday || isSelected || isPaidDay ? 700 : 500, cursor: isPaidDay ? 'default' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease'
                  }}
                >
                  <span>{day}</span>
                  {loggedHours > 0 && <span style={{ fontSize: '0.7rem', color: isPaidDay ? '#10B981' : '#3B82F6', fontWeight: 800 }}>{isPaidDay ? '✓ ' : ''}{loggedHours.toFixed(1)}h</span>}
                </button>

                {isLastSelected && isModalOpen && (
                  <div style={{
                    position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
                    background: '#0F172A', borderRadius: '16px', padding: 'var(--space-3)', boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 9999, width: '210px', border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <form action={addTimeEntry} onSubmit={() => setTimeout(() => { setIsModalOpen(false); setSelectedDates([]) }, 500)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <input type="hidden" name="dates" value={selectedDates.join(',')} />
                      <input type="hidden" name="project_id" value={selectedProjectId} />
                      <input type="hidden" name="task" value="General Work" />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                          {selectedDates.length > 1 ? `${selectedDates.length} Days` : 'Log hours'}
                        </span>
                        {hasLoggedTimeInSelection && (
                          <button 
                            type="submit"
                            formAction={deleteTimeEntries}
                            onClick={() => setTimeout(() => { setIsModalOpen(false); setSelectedDates([]) }, 500)}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Clear
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}><DurationPickerSmall initialMins={selectedDates.length === 1 ? Math.round((hoursByDate[selectedDates[0]] || 0) * 60) : 0} /></div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button type="button" onClick={() => { setIsModalOpen(false); setSelectedDates([]) }} style={{ flex: 1, minHeight: '36px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>Cancel</button>
                        <button type="submit" style={{ flex: 1, minHeight: '36px', borderRadius: '8px', background: '#2563EB', color: '#fff', border: 'none' }}>Save</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 3. Request Payment Footer */}
      {currentEntries.length > 0 && (
        <section className="animate-fade-in-up delay-2">
          <div className="glass-card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(159, 167, 255, 0.05)' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>End of Month?</h4>
              <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Request payment for your logged hours.</p>
            </div>
            <button 
              type="button"
              className="btn-primary"
              disabled={currentEntries.every(e => e.is_paid)}
              style={{ padding: '8px 16px', opacity: currentEntries.every(e => e.is_paid) ? 0.5 : 1 }}
              onClick={async () => {
                if (window.confirm(`Request payment for ${monthNames[month]} ${year}?`)) {
                  const res = await requestPayment(monthNames[month], year.toString())
                  if (res.success) toast.success('Payment request sent!')
                }
              }}
            >
              {currentEntries.every(e => e.is_paid) ? 'Already Paid 💰' : 'Request Payment'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function DurationPickerSmall({ initialMins = 0 }: { initialMins?: number }) {
  const [h, setH] = useState(initialMins > 0 ? Math.floor(initialMins / 60).toString() : '')
  const [m, setM] = useState(initialMins > 0 ? (initialMins % 60).toString() : '')
  const totalMins = (Number(h || 0) * 60) + Number(m || 0)
  return (
    <>
      <div style={{ flex: 1, position: 'relative' }}>
         <input type="number" value={h} onChange={e => setH(e.target.value)} placeholder="0" className={styles.dateInput} style={{ width: '100%', minHeight: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} min="0" />
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
         <input type="number" value={m} onChange={e => setM(e.target.value)} placeholder="0" className={styles.dateInput} style={{ width: '100%', minHeight: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} min="0" />
      </div>
      <input type="hidden" name="duration" value={totalMins > 0 ? totalMins : ''} required />
    </>
  )
}
