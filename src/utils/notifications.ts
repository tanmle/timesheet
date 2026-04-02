import { createAdminClient } from './supabase/admin'

export type NotificationType = 'info' | 'success' | 'warning' | 'payment' | 'request'

export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  link
}: {
  userId: string
  title: string
  message: string
  type?: NotificationType
  link?: string
}) {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: false
    })

  if (error) {
    console.error('Error creating notification:', error)
    // We don't throw here to avoid breaking the main flow
  }
}

export async function notifyAdmins({
  title,
  message,
  type = 'info',
  link
}: {
  title: string
  message: string
  type?: NotificationType
  link?: string
}) {
  const supabase = createAdminClient()
  
  // Find all admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      title,
      message,
      type,
      link,
      is_read: false
    }))

    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) {
      console.error('Error notifying admins:', error)
    }
  }
}
