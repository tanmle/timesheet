'use client'

import { useEffect, Suspense, useState, useTransition } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'

function NavigationHandler() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Finish progress on route change
    NProgress.done()
  }, [pathname, searchParams])

  useEffect(() => {
    NProgress.configure({ 
      showSpinner: true, 
      easing: 'ease', 
      speed: 500,
      minimum: 0.2
    })

    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (target && target.href && target.href !== window.location.href) {
        const url = new URL(target.href)
        if (url.origin === window.location.origin && !target.target && !e.ctrlKey && !e.metaKey) {
          NProgress.start()
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)
    return () => document.removeEventListener('click', handleAnchorClick)
  }, [])

  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <NavigationHandler />
      </Suspense>
      {children}
    </>
  )
}
