'use client'

import { useState } from 'react'
import styles from './page.module.css'

export default function DurationPicker() {
  const [hours, setHours] = useState<number | ''>('')
  const [minutes, setMinutes] = useState<number | ''>('')

  const setPreset = (h: number, m: number) => {
    setHours(h)
    setMinutes(m)
  }

  // Calculate total minutes for the hidden input
  const totalMinutes = (Number(hours || 0) * 60) + Number(minutes || 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="number"
            value={hours}
            onChange={e => setHours(e.target.value ? Number(e.target.value) : '')}
            className={`input-field ${styles.dateInput}`}
            placeholder="0"
            min="0"
          />
          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', pointerEvents: 'none', fontSize: '0.875rem' }}>hrs</span>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="number"
            value={minutes}
            onChange={e => setMinutes(e.target.value ? Number(e.target.value) : '')}
            className={`input-field ${styles.dateInput}`}
            placeholder="0"
            min="0"
            max="59"
          />
          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', pointerEvents: 'none', fontSize: '0.875rem' }}>min</span>
        </div>
      </div>

      {/* Suggested chips */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
         <span className="text-muted" style={{ fontSize: '0.8rem', marginRight: 'var(--space-1)', alignSelf: 'center' }}>Suggestions:</span>
         {[1, 2, 4, 6].map(h => (
           <button 
             key={h} 
             type="button" 
             onClick={() => setPreset(h, 0)}
             className={`badge ${hours === h && minutes === 0 ? 'badge-primary' : 'badge-info'}`}
             style={{ padding: '6px 14px', cursor: 'pointer', border: 'none', fontWeight: 600, transition: 'all 0.2s' }}
           >
             {h}h
           </button>
         ))}
         <button 
           type="button" 
           onClick={() => setPreset(0, 30)}
           className={`badge ${hours === 0 && minutes === 30 ? 'badge-primary' : 'badge-info'}`}
           style={{ padding: '6px 14px', cursor: 'pointer', border: 'none', fontWeight: 600, transition: 'all 0.2s' }}
         >
           30m
         </button>
      </div>

      <input type="hidden" name="duration" value={totalMinutes > 0 ? totalMinutes : ''} required />
    </div>
  )
}
