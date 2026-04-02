'use client'

import { login } from './actions'
import styles from './page.module.css'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { Suspense } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <div className={styles.wrapper}>
      <div className={styles.brandContainer}>
        <div className={styles.logo}></div>
        <h1 className={styles.appName}>Personal Timesheet</h1>
        <p className={styles.tagline}>Elevate your time tracking.</p>
      </div>

      <div className={`glass-card-elevated ${styles.authCard}`}>
        <h2 className={styles.cardTitle}>Welcome Back</h2>

        {message && (
          <div className={styles.errorMessage}>
            {message}
          </div>
        )}

        <form className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className="input-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input-field"
              placeholder="you@email.com"
              required
              autoComplete="email"
              spellCheck={false}
            />
          </div>

          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label htmlFor="password" className="input-label" style={{ margin: 0 }}>Password</label>
              <Link href="/login/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            formAction={login}
            className={`btn btn-primary ${styles.submitBtn}`}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
