'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notifyAdmins } from '@/utils/notifications'

export async function addTimeEntry(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not logged in')
  }

  const projectId = formData.get('project_id') as string
  const task = formData.get('task') as string || 'General Work'
  const rawDates = formData.get('dates') as string
  if (!rawDates) throw new Error('No dates provided')
    
  const datesArray = rawDates.split(',')

  const durationMin = parseInt(formData.get('duration') as string)

  if (!projectId || !durationMin) {
    throw new Error('Missing required fields')
  }

  const inserts = datesArray.map(date => ({
    user_id: user.id,
    project_id: projectId,
    task_description: task,
    date,
    duration_minutes: durationMin,
    is_paid: false
  }))

  // Overwrite semantics: delete previously logged entries for these dates and project first
  await supabase
    .from('time_entries')
    .delete()
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .in('date', datesArray)

  const { error } = await supabase
    .from('time_entries')
    .insert(inserts)

  // We should also increment the project's total_work_hour (ideally via an RPC or DB trigger)
  // But for simple purposes, let's just do a naive read/write to keep it simple, or leave it.

  if (error) {
    console.error(error)
    throw new Error('Failed to save entry')
  }

  // Just revalidate layout to refresh data everywhere, but don't redirect
  revalidatePath('/', 'layout')
}

export async function deleteTimeEntries(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const projectId = formData.get('project_id') as string
  const rawDates = formData.get('dates') as string
  if (!rawDates || !projectId) throw new Error('Missing fields')

  const datesArray = rawDates.split(',')

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .in('date', datesArray)

  if (error) {
    console.error(error)
    throw new Error('Failed to delete entries')
  }

  revalidatePath('/', 'layout')
}

export async function requestPayment(month: string, year: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get profile name for better notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const name = profile?.full_name || user.email

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const monthIndex = monthNames.indexOf(month)

  await notifyAdmins({
    title: 'Payment Requested 💰',
    message: `${name} has requested payment for ${month} ${year}.`,
    type: 'request',
    link: `/payroll/run?user_id=${user.id}&month=${monthIndex}&year=${year}`
  })

  revalidatePath('/', 'layout')
  return { success: true }
}
