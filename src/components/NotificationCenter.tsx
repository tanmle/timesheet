'use client'

import { useState, useEffect, useRef } from 'react'
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
  created_at: string
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

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

    // Real-time subscription - listens for new notifications targeting the current user
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
              style: { 
                background: 'rgba(15, 23, 42, 0.9)', 
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(159, 167, 255, 0.2)',
                color: '#fff'
              }
            })
          }
        )
        .subscribe((status) => {
          console.log('Realtime Subscription Status:', status)
        })

      return channel
    }

    const channelPromise = setupRealtime()

    return () => {
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel)
      })
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id: string) => {
    if (id === 'reminder-static') {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return '💰'
      case 'request': return '📩'
      case 'warning': return '⏰'
      case 'success': return '✅'
      default: return '🔔'
    }
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={styles.bellBtn} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={`glass-card-elevated ${styles.dropdown}`}>
          <div className={styles.header}>
            <h3>Notifications</h3>
          </div>
          
          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                 <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
                 <p>All caught up!</p>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className={styles.icon}>{getIcon(n.type)}</div>
                  <div className={styles.content}>
                    <p className={styles.title}>{n.title}</p>
                    <p className={styles.message}>{n.message}</p>
                    <p className={styles.date}>{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                  {!n.is_read && <div className={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>
          
          <div className={styles.footer}>
            <button onClick={() => setIsOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
