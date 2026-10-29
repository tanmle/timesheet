'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import styles from './NotificationCenter.module.css'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

type Notification = {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'payment' | 'request'
  is_read: boolean
  link?: string
  created_at: string
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const bellRef = useRef<HTMLButtonElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.error('Error fetching notifications:', error)
      return
    }

    // Add a dynamic "End of Month" reminder locally if it's the end of the month
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const isEndOfMonth = now.getDate() >= lastDay - 3

    let finalData = data || []
    
    if (isEndOfMonth && !finalData.some(n => n.title === 'Monthly Submission Reminder')) {
      finalData = [
        {
          id: 'reminder-static',
          user_id: user.id,
          title: 'Monthly Submission Reminder',
          message: 'The month is ending soon. Don\'t forget to submit your timesheets!',
          type: 'warning',
          is_read: false,
          created_at: new Date().toISOString()
        },
        ...finalData
      ]
    }

    setNotifications(finalData)
    setUnreadCount(finalData.filter(n => !n.is_read).length)
  }

  useEffect(() => {
    fetchNotifications()

    // Real-time subscription - listens for new notifications targeting current user
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('Realtime Notification Received:', payload)
            const newNotif = payload.new as Notification
            
            // Instant UI refresh
            fetchNotifications()
            
            // Pop-up Toast for immediate awareness
            toast(newNotif.title, {
              description: newNotif.message,
              icon: getIcon(newNotif.type),
              duration: 5000,
              action: newNotif.link ? {
                label: 'View',
                onClick: () => window.location.href = newNotif.link!
              } : undefined,
              style: { 
                background: 'rgba(15, 23, 42, 0.9)', 
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(159, 167, 255, 0.2)',
                color: '#fff'
              }
            })
          }
        )
        .subscribe()

      return channel
    }

    const channelPromise = setupRealtime()

    return () => {
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel)
      })
    }
  }, [])

  const markAsRead = async (id: string) => {
    if (id === 'reminder-static') {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
      return
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      toast.error('Could not mark as read')
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    const unreadDbItems = notifications.filter(n => !n.is_read && n.id !== 'reminder-static')
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)

    if (unreadDbItems.length === 0) {
      toast.success('All marked as read')
      return
    }

    const unreadIds = unreadDbItems.map(n => n.id)
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)

    if (error) {
      console.error('Error marking all as read:', error)
      toast.error('Could not update all on server')
      fetchNotifications() // Rollback on error
    } else {
      toast.success('All marked as read')
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return '💰'
      case 'request': return '📩'
      case 'warning': return '⏰'
      case 'success': return '✅'
      default: return '🔔'
    }
  }

  // Calculate dropdown position from bell button
  const getDropdownPosition = () => {
    if (!bellRef.current) return { top: 64, right: 16 }
    const rect = bellRef.current.getBoundingClientRect()
    return {
      top: rect.bottom + 10,
      right: Math.max(12, window.innerWidth - rect.right),
    }
  }

  return (
    <>
      <button 
        ref={bellRef}
        className={styles.bellBtn} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && createPortal(
        <>
          {/* Full-screen scrim */}
          <div
            className={styles.scrim}
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown panel */}
          <div
            className={styles.dropdown}
            style={{
              top: getDropdownPosition().top,
              right: getDropdownPosition().right,
            }}
          >
            <div className={styles.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <span className={styles.unreadBadge}>{unreadCount} new</span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  className={styles.markAllBtn}
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  ✓ Mark all as read
                </button>
              )}
            </div>
            
            <div className={styles.list}>
              {notifications.length === 0 ? (
                <div className={styles.empty}>
                   <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
                   <p>All caught up!</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button 
                    key={n.id} 
                    type="button"
                    className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className={styles.icon}>{getIcon(n.type)}</div>
                    <div className={styles.content}>
                      <p className={`${styles.title} ${n.is_read ? styles.titleRead : ''}`}>{n.title}</p>
                      <p className={styles.message}>{n.message}</p>
                      {n.link && (
                        <a 
                          href={n.link}
                          className={styles.actionLink}
                          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        >
                          Take Action <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </a>
                      )}
                      <span className={styles.time}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {!n.is_read && <div className={styles.unreadDot} />}
                  </button>
                ))
              )}
            </div>
            
            <div className={styles.footer}>
              <button type="button" onClick={() => setIsOpen(false)}>Close</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
