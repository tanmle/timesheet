'use client'

import { useEffect, useRef, type ReactNode } from 'react'

interface ModalOverlayProps {
  children: ReactNode
  onClose: () => void
}

/**
 * Accessible modal overlay with:
 * - Escape key to close
 * - aria-modal + role="dialog"
 * - Focus trap (basic: focus first focusable on mount)
 * - Click outside to close
 */
export default function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus first focusable element on mount
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const focusable = el.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.focus()
  }, [])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: 'var(--space-4)'
      }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  )
}
