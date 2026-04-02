'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import styles from './page.module.css'
import { createMember, updateMember, deleteMember, toggleUserStatus } from './actions'
import ModalOverlay from '@/components/ModalOverlay'

type Project = { id: string, name: string }
type Member = { id: string, full_name: string, email?: string, hourly_rate: number, exchange_rate?: number, bank_name?: string, bank_number?: string, status: string, projects?: string[], role?: string }

function StatusToggleForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const active = currentStatus === 'active'

  const handleToggle = async (e: React.FormEvent) => {
    e.preventDefault()
    const toastId = toast.loading('Updating status...')
    try {
      await toggleUserStatus(id, currentStatus)
      toast.success(`User set to ${active ? 'Inactive' : 'Active'}`, { id: toastId })
    } catch (error) {
      toast.error('Failed to update status', { id: toastId })
    }
  }

  return (
    <form onSubmit={handleToggle} style={{ margin: 0 }}>
      <div className={styles.statusControl} style={{ margin: 0, gap: '6px' }}>
        <span className={styles.statusLabel}>
          {active ? 'Active' : 'Inactive'}
        </span>
        <button
          type="submit"
          role="switch"
          aria-checked={active}
          className={`${styles.toggle} ${active ? styles.toggleOn : ''}`}
          id={`toggle-status-${id}`}
        >
          <span className={styles.toggleKnob} />
        </button>
      </div>
    </form>
  )
}

function MemberCard({ member, projectsList, onEdit, AVATAR_COLORS, index }: { member: Member, projectsList: Project[], onEdit: (m: Member, assignedNames: string) => void, AVATAR_COLORS: string[], index: number }) {
  const initials = (member.full_name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2)
  const assignedProjects = projectsList.filter(p => (member.projects || []).includes(p.id))
  const assignedNames = assignedProjects.map(p => p.name).join(', ')

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!confirm(`Delete team member "${member.full_name}"?`)) return
    
    const formData = new FormData(e.currentTarget)
    const toastId = toast.loading('Deleting member...')
    
    try {
      await deleteMember(formData)
      toast.success('Member removed from team', { id: toastId })
    } catch (error) {
      toast.error('Failed to remove member', { id: toastId })
    }
  }

  return (
    <div className={`glass-card ${styles.memberCard}`} id={`member-${member.id}`}>
      {/* Card Header: Avatar + Info */}
      <div className={styles.cardHeader} style={{ position: 'relative' }}>
        <div
          className={styles.avatar}
          style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
        >
          <span>{initials}</span>
        </div>
        <div className={styles.memberInfo}>
          <h3 className={styles.memberName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {member.full_name || 'Unknown User'}
            <span style={{ 
              fontSize: '0.65rem', padding: '2px 8px', borderRadius: '100px', 
              background: member.role === 'admin' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.1)', 
              color: member.role === 'admin' ? '#60A5FA' : '#cbd5e1', 
              fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' 
            }}>
              {member.role || 'user'}
            </span>
          </h3>
          <p className={styles.memberRole} style={{ margin: '2px 0 0 0' }}>{member.email || 'No email associated'}</p>
        </div>
        {member.role !== 'admin' && (
          <div style={{ marginLeft: 'auto' }}>
            <StatusToggleForm id={member.id} currentStatus={member.status} />
          </div>
        )}
      </div>

      {/* Rate & Projects Setup */}
      {member.role !== 'admin' && (
        <div className={styles.cardDetails} style={{ marginBottom: 'auto' }}>
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <div className={styles.detailItem} style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span className={styles.detailLabel}>Hourly Rate</span>
              <span className={styles.detailRate}>${member.hourly_rate || 0}/hr</span>
            </div>
            <div className={styles.detailItem} style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span className={styles.detailLabel}>Exchange Rate</span>
              <span className={styles.detailValue} style={{ fontSize: '0.85rem' }}>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(member.exchange_rate || 25000)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <div className={styles.detailItem} style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span className={styles.detailLabel}>Bank Name</span>
              <span className={styles.detailValue} style={{ fontSize: '0.85rem' }}>{member.bank_name || 'Not set'}</span>
            </div>
            <div className={styles.detailItem} style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span className={styles.detailLabel}>Bank Number</span>
              <span className={styles.detailValue} style={{ fontSize: '0.85rem' }}>{member.bank_number || 'Not set'}</span>
            </div>
          </div>
          <div className={styles.detailItem} style={{ marginTop: 'var(--space-2)', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <span className={styles.detailLabel}>Assigned Projects</span>
            {assignedProjects.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {assignedProjects.map(p => (
                  <span key={p.id} style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e2e8f0',
                    whiteSpace: 'nowrap'
                  }}>
                    {p.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className={styles.detailValue} style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>None</span>
            )}
          </div>
        </div>
      )}

      {/* Status Toggle & Actions */}
      <div className={styles.cardFooter} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button onClick={() => onEdit(member, assignedNames)} className="btn btn-ghost btn-sm" style={{ flex: 1, minHeight: '36px', background: 'rgba(255,255,255,0.05)' }}>Edit</button>
            <form onSubmit={handleDelete} style={{ flex: 1, margin: 0 }}>
                <input type="hidden" name="id" value={member.id} />
                <button type="submit" className="btn btn-ghost btn-sm" style={{ width: '100%', minHeight: '36px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                    Delete
                </button>
            </form>
        </div>
      </div>
    </div>
  )
}

export default function TeamClient({ teamMembers, projects }: { teamMembers: Member[], projects: Project[] }) {
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [activeMember, setActiveMember] = useState<Member | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [banks, setBanks] = useState<{ id: number, name: string, code: string, bin: string, shortName: string }[]>([])

  useEffect(() => {
    fetch('https://api.vietqr.io/v2/banks')
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setBanks(data.data)
        }
      })
      .catch(console.error)
  }, [])

  const filteredMembers = teamMembers.filter(m => 
    (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = teamMembers.filter(m => m.status === 'active').length

  const AVATAR_COLORS = [
    'linear-gradient(135deg, #9fa7ff 0%, #6366f1 100%)',
    'linear-gradient(135deg, #be83fa 0%, #8b5cf6 100%)',
    'linear-gradient(135deg, #48e5d0 0%, #14b8a6 100%)',
    'linear-gradient(135deg, #ff6e84 0%, #f43f5e 100%)',
    'linear-gradient(135deg, #ffd166 0%, #f59e0b 100%)',
  ]

  const closeForm = () => {
    setModalMode(null)
    setActiveMember(null)
  }

  const openEdit = (member: Member) => {
    setActiveMember(member)
    setModalMode('edit')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const toastId = toast.loading(modalMode === 'add' ? 'Adding team member...' : 'Updating member...')
    
    try {
      if (modalMode === 'add') {
        const result = await createMember(formData) as any
        if (result?.error) throw new Error(result.error)
        toast.success('Member added successfully', { id: toastId })
      } else {
        await updateMember(activeMember!.id, formData)
        toast.success('Member updated successfully', { id: toastId })
      }
      closeForm()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save member', { id: toastId })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }} className="animate-fade-in-up">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Management</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem', margin: '2px 0 0 0' }}>Oversee your team and payroll permissions.</p>
        </div>
        <button onClick={() => setModalMode('add')} className="btn btn-primary" style={{ display: 'flex', gap: '8px', minHeight: '40px', padding: '0 16px' }} id="add-user-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add User
        </button>
      </div>

      {/* Summary Stats */}
      <div className={`${styles.statsRow} animate-fade-in-up delay-1`}>
        <div className={`glass-card ${styles.miniStat}`}>
          <p className="stat-label">Team Size</p>
          <p className="stat-value accent">{teamMembers.length}</p>
        </div>
        <div className={`glass-card ${styles.miniStat}`}>
          <p className="stat-label">Active</p>
          <p className="stat-value" style={{ color: 'var(--tertiary)' }}>{activeCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className={`${styles.searchWrapper} animate-fade-in-up delay-2`}>
        <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="search-users"
          type="text"
          className={`input-field ${styles.searchInput}`}
          placeholder="Search team members by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Team Members List */}
      <div className={`${styles.membersList} animate-fade-in-up delay-3`}>
        {filteredMembers.length === 0 ? (
          <div className="glass-card" style={{ padding: 'var(--space-8)', textAlign: 'center', gridColumn: '1 / -1' }}>
            <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>No team members found.</p>
            {!searchQuery && <button onClick={() => setModalMode('add')} className="btn btn-primary">Add Team Member</button>}
          </div>
        ) : (
          filteredMembers.map((member, index) => (
            <MemberCard key={member.id} member={member} projectsList={projects} onEdit={openEdit} AVATAR_COLORS={AVATAR_COLORS} index={index} />
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{modalMode === 'add' ? 'Add Team Member' : 'Edit Team Member'}</h3>
              <button type="button" onClick={closeForm} className="btn-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>FULL NAME</label>
                <input type="text" name="full_name" defaultValue={activeMember?.full_name || ''} className="input-field" placeholder="Jane Doe" required style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              
              <div>
                <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>EMAIL {modalMode === 'edit' && <span style={{ opacity: 0.5}}>(Optional)</span>}</label>
                <input type="email" name="email" className="input-field" placeholder="jane@example.com" required={modalMode === 'add'} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              
              {activeMember?.role !== 'admin' && (
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <div style={{ flex: 1 }}>
                    <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>HOURLY RATE ($)</label>
                    <input type="number" name="hourly_rate" defaultValue={activeMember?.hourly_rate || ''} className="input-field" placeholder="30" min="0" step="1" required style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>EXCHANGE RATE (VND)</label>
                    <input type="number" name="exchange_rate" defaultValue={activeMember?.exchange_rate || 25000} className="input-field" placeholder="25000" min="0" step="1" required style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>BANK NAME</label>
                  <select name="bank_name" defaultValue={activeMember?.bank_name || ''} className="input-field" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                    <option value="" style={{ color: '#000' }}>Select Bank (Optional)</option>
                    {banks.map(b => (
                      <option key={b.bin} value={b.shortName} style={{ color: '#000' }}>{b.shortName} - {b.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>BANK NUMBER</label>
                  <input type="text" name="bank_number" defaultValue={activeMember?.bank_number || ''} className="input-field" placeholder="0123456789" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
              
              {modalMode === 'edit' && activeMember?.role !== 'admin' && (
                <div>
                  <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>STATUS</label>
                  <select name="status" defaultValue={activeMember?.status || 'active'} className="input-field" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', appearance: 'none' }}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              {activeMember?.role !== 'admin' && (
                <div>
                  <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>ASSIGNED PROJECTS (Multi-select)</label>
                  <select 
                     name="projects" 
                     multiple 
                     defaultValue={activeMember?.projects || []} 
                     className="input-field" 
                     style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', minHeight: '120px' }}>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id} style={{ padding: '8px' }}>{p.name}</option>
                    ))}
                  </select>
                  <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '6px' }}>Hold Ctrl (Cmd on Mac) to select multiple</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button type="button" onClick={closeForm} style={{ flex: 1, minHeight: '44px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ flex: 2, minHeight: '44px', borderRadius: '12px', background: '#2563EB', color: '#fff', fontSize: '1rem', fontWeight: 700, border: 'none' }}>{modalMode === 'add' ? 'Add Member' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
