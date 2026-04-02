'use client'

export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      style={{
        position: 'absolute',
        top: '-40px',
        left: 0,
        background: 'var(--primary)',
        color: 'var(--on-primary)',
        padding: '8px 16px',
        zIndex: 100000,
        transition: 'top 0.2s',
      }}
      onFocus={(e) => { (e.target as HTMLElement).style.top = '0' }}
      onBlur={(e) => { (e.target as HTMLElement).style.top = '-40px' }}
    >
      Skip to content
    </a>
  )
}
