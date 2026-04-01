'use client'

import { toast } from 'sonner'
import { useState } from 'react'
import { deleteTimeEntry } from '../actions'

export default function DeleteEntryButton({ entryId, onSuccess }: { entryId: string, onSuccess?: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    
    setIsDeleting(true)
    const toastId = toast.loading('Deleting entry...')
    
    try {
      await deleteTimeEntry(entryId)
      toast.success('Entry deleted', { id: toastId })
      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete entry', { id: toastId })
      setIsDeleting(false)
    }
  }

  return (
    <button 
      onClick={handleDelete} 
      disabled={isDeleting}
      className="btn-icon" 
      style={{ 
        color: 'var(--error)', 
        opacity: isDeleting ? 0.5 : 1,
        padding: '4px',
        borderRadius: '8px',
        height: 'auto',
        width: 'auto',
        background: 'rgba(239, 68, 68, 0.05)'
      }}
      aria-label="Delete entry"
      title="Delete entry"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18"></path>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
      </svg>
    </button>
  )
}
