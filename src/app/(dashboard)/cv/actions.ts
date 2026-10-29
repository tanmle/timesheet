'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { CVData, CVRecord } from './types'

export async function getCVs(): Promise<{ success: boolean; data: CVRecord[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, data: [], error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.warn('Supabase cvs fetch warning (table may not exist yet):', error.message)
      return { success: false, data: [], error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('getCVs error:', err)
    return { success: false, data: [], error: err?.message || 'Failed to fetch CVs' }
  }
}

export async function saveCV(
  title: string,
  data: CVData,
  id?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const now = new Date().toISOString()

    if (id) {
      const { data: updated, error } = await supabase
        .from('cvs')
        .update({
          title,
          data,
          updated_at: now,
        })
        .eq('id', id)
        .select('id')
        .single()

      if (error) {
        return { success: false, error: error.message }
      }
      revalidatePath('/cv')
      return { success: true, id: updated?.id || id }
    } else {
      const { data: inserted, error } = await supabase
        .from('cvs')
        .insert({
          title,
          data,
          created_by: user.id,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single()

      if (error) {
        return { success: false, error: error.message }
      }
      revalidatePath('/cv')
      return { success: true, id: inserted?.id }
    }
  } catch (err: any) {
    console.error('saveCV error:', err)
    return { success: false, error: err?.message || 'Failed to save CV' }
  }
}

export async function deleteCV(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('cvs')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/cv')
    return { success: true }
  } catch (err: any) {
    console.error('deleteCV error:', err)
    return { success: false, error: err?.message || 'Failed to delete CV' }
  }
}
