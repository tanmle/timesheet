'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import styles from '../page.module.css'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSuccess(true)
      toast.success('Password reset email sent!')
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
        <h2 className={styles.cardTitle}>Reset Password</h2>
        <p className="text-muted" style={{ marginBottom: 'var(--space-6)', textAlign: 'center', fontSize: '0.9rem' }}>
          {success 
            ? "We've sent a recovery link to your email. Please check your inbox and follow the instructions."
            : "Enter your email address and we'll send you a link to reset your password."}
        </p>

        {!success && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className="input-label">Email Address</label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className={`btn btn-primary ${styles.submitBtn}`}>
              {loading ? 'Sending link...' : 'Send Recovery Link'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <Link href="/login" className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
