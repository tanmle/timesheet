'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import styles from '../page.module.css'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully!')
      router.push('/login')
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.brandContainer}>
        <div className={styles.logo}></div>
        <h1 className={styles.appName}>Personal Timesheet</h1>
        <p className={styles.tagline}>Security & Recovery</p>
      </div>

      <div className={`glass-card-elevated ${styles.authCard}`}>
        <h2 className={styles.cardTitle}>New Password</h2>
        <p className="text-muted" style={{ marginBottom: 'var(--space-6)', textAlign: 'center', fontSize: '0.9rem' }}>
          Please enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="password" className="input-label">New Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirm-password" className="input-label">Confirm New Password</label>
            <input
              id="confirm-password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" disabled={loading} className={`btn btn-primary ${styles.submitBtn}`}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
