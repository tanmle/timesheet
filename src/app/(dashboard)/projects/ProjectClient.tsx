'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import styles from './page.module.css'
import { createProject, updateProject, deleteProject, toggleProjectStatus } from './actions'
import ModalOverlay from '@/components/ModalOverlay'

type Project = { 
  id: string, 
  name: string, 
  description: string, 
  rate: number, 
  exchange_rate: number,
  status: string, 
  actualHours: number,
  totalRevenue: number,
  totalPaid: number,
  totalProfit: number
}

type GlobalStats = {
  totalRevenue: number,
  totalPaid: number,
  totalProfit: number,
  totalHours: number
}

export default function ProjectClient({ projects, globalStats }: { projects: Project[], globalStats: GlobalStats }) {
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  const activeProjects = projects.filter(p => p.status === 'active')
  const completedProjects = projects.filter(p => p.status === 'completed')

  const closeForm = () => {
    setModalMode(null)
    setActiveProject(null)
  }

  const openEdit = (project: Project) => {
    setActiveProject(project)
    setModalMode('edit')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const toastId = toast.loading(modalMode === 'add' ? 'Creating project...' : 'Updating project...')
    
    try {
      if (modalMode === 'add') {
        await createProject(formData)
        toast.success('Project created successfully', { id: toastId })
      } else {
        await updateProject(activeProject!.id, formData)
        toast.success('Project updated successfully', { id: toastId })
      }
      closeForm()
    } catch (error) {
      toast.error('Failed to save project', { id: toastId })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }} className="animate-fade-in-up">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Projects</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem', margin: '2px 0 0 0' }}>Track progress and profitability across client work.</p>
        </div>
        <button onClick={() => setModalMode('add')} className="btn btn-primary" style={{ display: 'flex', gap: '8px', minHeight: '40px', padding: '0 16px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New Project
        </button>
      </div>

      {/* Stats Row */}
      <div className={`${styles.statsRow} animate-fade-in-up delay-1`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="glass-card" style={{ padding: 'var(--space-4)', borderRadius: '16px' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Active Projects</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3B82F6', margin: 0 }}>{activeProjects.length}</p>
        </div>
        <div className="glass-card" style={{ padding: 'var(--space-4)', borderRadius: '16px' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Total Revenue</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', margin: 0 }}>
             ₫{(globalStats?.totalRevenue || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="glass-card" style={{ padding: 'var(--space-4)', borderRadius: '16px' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Total Paid</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', margin: 0 }}>
             ₫{(globalStats?.totalPaid || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="glass-card" style={{ padding: 'var(--space-4)', borderRadius: '16px' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Net Profit</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#8B5CF6', margin: 0 }}>
             ₫{(globalStats?.totalProfit || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className={`${styles.projectsGrid} animate-fade-in-up delay-2`}>
        {projects.length === 0 ? (
          <div className="glass-card" style={{ padding: 'var(--space-8)', textAlign: 'center', gridColumn: '1 / -1' }}>
            <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>No projects created yet.</p>
            <button onClick={() => setModalMode('add')} className="btn btn-primary">Create First Project</button>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} onEdit={openEdit} />
          ))
        )}
      </div>

      {/* Editor Modal */}
      {modalMode && (
        <ModalOverlay onClose={closeForm}>
          <div style={{
            background: '#0F172A',
            width: '100%',
            maxWidth: '480px',
            borderRadius: '24px',
            padding: 'var(--space-6)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            maxHeight: '85vh',
            overflowY: 'auto',
          }} className="animate-fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{modalMode === 'add' ? 'Add New Project' : 'Edit Project'}</h3>
              <button type="button" onClick={closeForm} className="btn-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>PROJECT NAME</label>
                <input type="text" name="name" defaultValue={activeProject?.name || ''} className="input-field" placeholder="e.g. Website Redesign" required style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>DESCRIPTION</label>
                <input type="text" name="description" defaultValue={activeProject?.description || ''} className="input-field" placeholder="Short description..." style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>HOURLY RATE ($ / h)</label>
                  <input type="number" name="rate" defaultValue={activeProject?.rate || ''} className="input-field" placeholder="50" min="0" step="1" required style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>X-RATE (VND)</label>
                  <input type="number" name="exchange_rate" defaultValue={activeProject?.exchange_rate || '25000'} className="input-field" placeholder="25000" min="0" step="1" required style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div style={{ flex: '1 1 100%' }}>
                  <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>STATUS</label>
                  <select name="status" defaultValue={activeProject?.status || 'active'} className="input-field">
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button type="button" onClick={closeForm} style={{ flex: 1, minHeight: '44px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ flex: 2, minHeight: '44px', borderRadius: '12px', background: '#2563EB', color: '#fff', fontSize: '1rem', fontWeight: 700, border: 'none' }}>Save Project</button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

function ProjectCard({ project, onEdit }: { project: Project, onEdit: (p: Project) => void }) {
  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!confirm(`Delete "${project.name}"?`)) return
    
    const formData = new FormData(e.currentTarget)
    const toastId = toast.loading('Deleting project...')
    
    try {
      await deleteProject(formData)
      toast.success('Project deleted successfully', { id: toastId })
    } catch (error) {
      toast.error('Failed to delete project', { id: toastId })
    }
  }

  const handleToggleStatus = async () => {
    const toastId = toast.loading('Updating status...')
    try {
      await toggleProjectStatus(project.id, project.status)
      toast.success(`Project marked as ${project.status === 'active' ? 'Done' : 'Active'}`, { id: toastId })
    } catch (error) {
      toast.error('Failed to update status', { id: toastId })
    }
  }

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-5)', borderRadius: '20px', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{project.name}</h3>
            <button 
              onClick={handleToggleStatus}
              className={`badge ${project.status === 'active' ? 'badge-info' : 'badge-success'}`}
              style={{ border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
              title={project.status === 'active' ? 'Mark as Done' : 'Set as Active'}
            >
              {project.status === 'completed' ? '✓ Done' : '● Active'}
            </button>
          </div>
          <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>{project.description || 'No description'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--surface-variant)', borderRadius: '12px' }}>
        <div>
          <p className="text-muted" style={{ fontSize: '0.7rem', margin: '0 0 2px 0', fontWeight: 700, letterSpacing: '0.05em' }}>HOURS</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{(project.actualHours || 0).toFixed(1)}h</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="text-muted" style={{ fontSize: '0.7rem', margin: '0 0 2px 0', fontWeight: 700, letterSpacing: '0.05em' }}>REVENUE</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981', margin: 0 }}>₫{project.totalRevenue.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div>
          <p className="text-muted" style={{ fontSize: '0.7rem', margin: '0 0 2px 0', fontWeight: 700, letterSpacing: '0.05em' }}>PAID</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F59E0B', margin: 0 }}>₫{project.totalPaid.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="text-muted" style={{ fontSize: '0.7rem', margin: '0 0 2px 0', fontWeight: 700, letterSpacing: '0.05em' }}>PROFIT</p>
          <p style={{ fontSize: '1.15rem', fontWeight: 800, color: '#8B5CF6', margin: 0 }}>₫{project.totalProfit.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <button onClick={() => onEdit(project)} className="btn btn-secondary" style={{ flex: 1, minHeight: '36px' }}>Edit</button>
        <form onSubmit={handleDelete} style={{ flex: 1 }}>
          <input type="hidden" name="id" value={project.id} />
          <button type="submit" className="btn btn-ghost" style={{ width: '100%', minHeight: '36px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
            Delete
          </button>
        </form>
      </div>
    </div>
  )
}
