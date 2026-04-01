'use client'

import { login } from './actions'
import styles from './page.module.css'
import { useSearchParams } from 'next/navigation'

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
              placeholder="you@company.com"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className="input-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              required
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
