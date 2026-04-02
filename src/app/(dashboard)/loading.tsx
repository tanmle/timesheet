import styles from './page.module.css'

export default function DashboardLoading() {
  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Quick Stats Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card animate-pulse" style={{ height: '100px', background: 'rgba(25,37,64,0.3)', border: 'none' }} />
        ))}
      </div>

      {/* Projects Section Skeleton */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ height: '30px', width: '120px', borderRadius: '8px', marginBottom: '1.5rem' }} className="skeleton" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2].map((i) => (
            <div key={i} className="glass-card animate-pulse" style={{ height: '80px', background: 'rgba(25,37,64,0.3)', border: 'none' }} />
          ))}
        </div>
      </div>

      {/* Recent Entries Skeleton */}
      <div>
        <div style={{ height: '30px', width: '150px', borderRadius: '8px', marginBottom: '1.5rem' }} className="skeleton" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.7 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card animate-pulse" style={{ height: '120px', background: 'rgba(25,37,64,0.3)', border: 'none' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
