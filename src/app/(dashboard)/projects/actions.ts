'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const rate = parseFloat(formData.get('rate') as string) || 0
  const exchange_rate = parseFloat(formData.get('exchange_rate') as string) || 25000

  if (!name) throw new Error("Name required")

  const { error } = await admin.from('projects').insert({
    name,
    rate,
    exchange_rate,
    description: formData.get('description') as string || '',
    status: 'active',
  })

  if (error) {
    console.error('Create project error:', error)
    throw new Error('Could not create project')
  }

  revalidatePath('/', 'layout')
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const rate = parseFloat(formData.get('rate') as string) || 0
  const exchange_rate = parseFloat(formData.get('exchange_rate') as string) || 25000
  const description = formData.get('description') as string || ''
  const status = formData.get('status') as string || 'active'

  if (!name) throw new Error("Name required")

  const { error } = await admin.from('projects').update({
    name,
    rate,
    exchange_rate,
    description,
    status
  }).eq('id', id)

  if (error) {
    console.error('Update project error:', error)
    throw new Error('Could not update project')
  }

  revalidatePath('/', 'layout')
}

export async function deleteProject(formData: FormData) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const id = formData.get('id') as string
  if (!id) throw new Error('Missing project id')

  const { error } = await admin.from('projects').delete().eq('id', id)

  if (error) {
    console.error('Delete project error:', error)
    throw new Error('Could not delete project')
  }

  revalidatePath('/', 'layout')
}

export async function toggleProjectStatus(id: string, currentStatus: string) {
  const admin = createAdminClient()
  const newStatus = currentStatus === 'active' ? 'completed' : 'active'
  
  const { error } = await admin
    .from('projects')
    .update({ status: newStatus })
    .eq('id', id)

  if (error) {
    console.error('Toggle project status error:', error)
    throw new Error('Could not toggle status')
  }

  revalidatePath('/', 'layout')
}

