'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function seedDemoData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Must be logged in to seed data")

  // Seed Projects
  const { data: projects, error: pErr } = await supabase.from('projects').insert([
    { name: 'Mobile App Redesign', description: 'React Native app overhaul', rate: 75, total_work_hour: 40, spent_amount: 3000, status: 'active' },
    { name: 'Backend API', description: 'Node.js GraphQL API', rate: 100, total_work_hour: 20, spent_amount: 2000, status: 'active' },
    { name: 'Client Dashboard', description: 'Next.js admin panel', rate: 85, total_work_hour: 60, spent_amount: 5100, status: 'active' },
  ]).select()

  if (pErr || !projects) {
    console.error(pErr)
    throw new Error('Failed to seed projects')
  }

  // Seed Payroll
  const { data: payrolls, error: payErr } = await supabase.from('payroll').insert([
    { month_name: 'October 2026', total_amount: 12450, total_hours: 156, employee_count: 12, status: 'draft' }
  ]).select()

  // Seed Time Entries
  const today = new Date().toISOString().split('T')[0]
  const entriesData = [
    { user_id: user.id, project_id: projects[0].id, task_description: 'UI Component Library', date: today, duration_minutes: 210, is_paid: false },
    { user_id: user.id, project_id: projects[1].id, task_description: 'Auth Middleware', date: today, duration_minutes: 120, is_paid: false },
    { user_id: user.id, project_id: projects[2].id, task_description: 'Chart Integration', date: today, duration_minutes: 60, is_paid: false },
  ]

  const { error: tErr } = await supabase.from('time_entries').insert(entriesData)
  
  if (tErr) {
    console.error(tErr)
    throw new Error('Failed to seed time entries')
  }

  // Link user profile to these projects
  const projectIds = projects.map(p => p.id)
  await supabase.from('profiles').update({ projects: projectIds }).eq('id', user.id)

  revalidatePath('/', 'layout')
}

export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error('Could not sign out')
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Check if entry exists and is unpaid
  const { data: entry, error: fetchErr } = await supabase
    .from('time_entries')
    .select('*, profiles(role)')
    .eq('id', entryId)
    .single()

  if (fetchErr || !entry) throw new Error('Entry not found')

  // Rule: Standard users can only delete their own UNPAID entries
  const isOwner = entry.user_id === user.id
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  if (!isAdmin && !isOwner) throw new Error('You do not have permission to delete this entry')
  if (entry.is_paid) throw new Error('Cannot delete a paid entry')

  const { error: delErr } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', entryId)

  if (delErr) throw new Error('Failed to delete time entry')

  revalidatePath('/', 'layout')
}
