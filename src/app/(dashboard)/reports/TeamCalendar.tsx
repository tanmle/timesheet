'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

type CalendarEntry = {
  date: string
  duration_minutes: number
  task_description: string
  project_id: string
  profiles: any
  projects: any
}

interface TeamCalendarProps {
  isAdmin: boolean
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getHeatColor(hours: number, maxHours: number): string {
  if (hours === 0) return 'transparent'
  const intensity = Math.min(hours / Math.max(maxHours, 1), 1)
  // Gradient from dim primary to bright tertiary
  if (intensity < 0.25) return 'rgba(159, 167, 255, 0.12)'
  if (intensity < 0.5) return 'rgba(159, 167, 255, 0.25)'
  if (intensity < 0.75) return 'rgba(141, 152, 255, 0.40)'
  return 'rgba(72, 229, 208, 0.35)'
}

function getHeatBorder(hours: number, maxHours: number): string {
  if (hours === 0) return '1px solid transparent'
  const intensity = Math.min(hours / Math.max(maxHours, 1), 1)
  if (intensity < 0.25) return '1px solid rgba(159, 167, 255, 0.15)'
  if (intensity < 0.5) return '1px solid rgba(159, 167, 255, 0.3)'
  if (intensity < 0.75) return '1px solid rgba(141, 152, 255, 0.45)'
  return '1px solid rgba(72, 229, 208, 0.4)'
}

function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TeamCalendar({ isAdmin }: TeamCalendarProps) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  // Fetch entries for the displayed month
  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true)
      const firstDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const lastDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      let query = supabase
        .from('time_entries')
        .select('date, duration_minutes, task_description, project_id, profiles(full_name), projects(name)')
        .gte('date', firstDate)
        .lte('date', lastDate)
        .order('date', { ascending: true })

      // If not admin, only fetch current user's entries
      if (!isAdmin) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          query = query.eq('user_id', user.id)
        }
      }

      const { data } = await query
      setEntries((data as CalendarEntry[]) || [])
      setLoading(false)
    }

    fetchEntries()
    setSelectedDate(null)
  }, [month, year, isAdmin])

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedDate(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Calendar grid computation
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = formatYMD(now)

  // Group data by date
  const hoursByDate: Record<string, number> = {}
  const entriesByDate: Record<string, CalendarEntry[]> = {}

  entries.forEach(e => {
    const h = e.duration_minutes / 60
    hoursByDate[e.date] = (hoursByDate[e.date] || 0) + h
    if (!entriesByDate[e.date]) entriesByDate[e.date] = []
    entriesByDate[e.date].push(e)
  })

  const maxHoursInMonth = Math.max(...Object.values(hoursByDate), 0)

  // Group selected day's entries by person
  const selectedDayDetails = useMemo(() => {
    if (!selectedDate || !entriesByDate[selectedDate]) return []
    const byPerson: Record<string, { name: string; hours: number; tasks: { project: string; desc: string; hours: number }[] }> = {}

    entriesByDate[selectedDate].forEach(e => {
      const personName = e.profiles?.full_name || 'You'
      if (!byPerson[personName]) {
        byPerson[personName] = { name: personName, hours: 0, tasks: [] }
      }
      const h = e.duration_minutes / 60
      byPerson[personName].hours += h
      byPerson[personName].tasks.push({
        project: e.projects?.name || 'Unknown',
        desc: e.task_description,
        hours: h,
      })
    })

    return Object.values(byPerson).sort((a, b) => b.hours - a.hours)
  }, [selectedDate, entries])

  const totalSelectedHours = selectedDayDetails.reduce((acc, p) => acc + p.hours, 0)

  // Build day cells
  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const handlePrev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }

  const handleNext = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }

  // Total hours this month
  const totalMonthHours = Object.values(hoursByDate).reduce((a, b) => a + b, 0)
  const activeDays = Object.keys(hoursByDate).length

  return (
    <section className="animate-fade-in-up delay-2" style={{ marginBottom: 'var(--space-6)' }}>
      <div className="glass-card-elevated" style={{ padding: 'var(--space-5)', position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, marginBottom: '2px' }}>
              {isAdmin ? 'Team Activity' : 'Your Activity'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--outline)', margin: 0 }}>
              {activeDays} active day{activeDays !== 1 ? 's' : ''} · {totalMonthHours.toFixed(1)}h total
            </p>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--outline)', marginRight: '4px' }}>Less</span>
            {[0.1, 0.3, 0.6, 1.0].map((i, idx) => (
              <div
                key={idx}
                style={{
                  width: '12px', height: '12px', borderRadius: '3px',
                  background: getHeatColor(i * 10, 10),
                  border: getHeatBorder(i * 10, 10),
                }}
              />
            ))}
            <span style={{ fontSize: '0.6rem', color: 'var(--outline)', marginLeft: '4px' }}>More</span>
          </div>
        </div>

        {/* Month Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <button type="button" onClick={handlePrev} className="btn-icon" style={{ width: '36px', height: '36px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            {MONTH_NAMES[month]} {year}
          </h2>
          <button type="button" onClick={handleNext} className="btn-icon" style={{ width: '36px', height: '36px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        {/* Day Labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--outline)', padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: '10px' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', position: 'relative' }}>
            {days.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} />

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const hours = hoursByDate[dateStr] || 0
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const isWeekend = (idx % 7 === 0) || (idx % 7 === 6)

              return (
                <div key={idx} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '10px',
                      border: isSelected
                        ? '2px solid var(--primary)'
                        : isToday
                          ? '2px solid rgba(159, 167, 255, 0.4)'
                          : getHeatBorder(hours, maxHoursInMonth),
                      background: isSelected
                        ? 'rgba(159, 167, 255, 0.2)'
                        : getHeatColor(hours, maxHoursInMonth),
                      color: isWeekend && hours === 0
                        ? 'var(--outline-variant)'
                        : hours > 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                      fontWeight: isToday || hours > 0 ? 700 : 400,
                      cursor: hours > 0 ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '1px',
                      fontSize: '0.8125rem',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <span>{day}</span>
                    {hours > 0 && (
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        color: hours >= maxHoursInMonth * 0.75 ? '#48e5d0' : '#9fa7ff',
                        lineHeight: 1,
                      }}>
                        {hours.toFixed(1)}h
                      </span>
                    )}
                    {isToday && (
                      <div style={{
                        position: 'absolute',
                        bottom: '3px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                      }} />
                    )}
                  </button>

                  {/* Popover for selected day */}
                  {isSelected && hours > 0 && (
                    <div
                      ref={popoverRef}
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 10px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(9, 19, 40, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        padding: '14px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(159, 167, 255, 0.15)',
                        zIndex: 100,
                        width: '240px',
                        animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      {/* Popover header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                          {new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 800,
                          background: 'rgba(72, 229, 208, 0.15)',
                          color: '#48e5d0',
                          padding: '2px 8px',
                          borderRadius: '100px',
                        }}>
                          {totalSelectedHours.toFixed(1)}h
                        </span>
                      </div>

                      {/* Person list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {selectedDayDetails.map((person, pIdx) => (
                          <div key={pIdx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{
                                fontSize: '0.75rem', fontWeight: 700,
                                color: 'var(--primary)',
                                display: 'flex', alignItems: 'center', gap: '6px',
                              }}>
                                <span style={{
                                  width: '6px', height: '6px', borderRadius: '50%',
                                  background: `hsl(${pIdx * 60 + 230}, 80%, 70%)`,
                                  display: 'inline-block',
                                }} />
                                {person.name}
                              </span>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                                {person.hours.toFixed(1)}h
                              </span>
                            </div>
                            {person.tasks.map((task, tIdx) => (
                              <div key={tIdx} style={{
                                fontSize: '0.65rem',
                                color: 'var(--outline)',
                                paddingLeft: '12px',
                                marginBottom: '2px',
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                                  {task.project} — {task.desc}
                                </span>
                                <span style={{ flexShrink: 0, marginLeft: '8px', fontWeight: 600 }}>
                                  {task.hours.toFixed(1)}h
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
