'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/utils/auth'

export async function deletePayrollRun(runId: string) {
  await requireAuth('admin')
  const supabase = createAdminClient()

  // 1. Un-mark entries as paid and clear their link to this run
  const { error: resetError } = await supabase
    .from('time_entries')
    .update({ 
      is_paid: false, 
      payroll_id: null 
    })
    .eq('payroll_id', runId)

  if (resetError) {
    console.error('Reset Error:', resetError)
    throw new Error('Failed to un-mark entries as paid')
  }

  // 2. Delete the actual history record
  const { error: deleteError } = await supabase
    .from('payroll')
    .delete()
    .eq('id', runId)

  if (deleteError) {
    console.error('Delete Error:', deleteError)
    throw new Error('Failed to delete payroll record')
  }

  revalidatePath('/payroll')
  revalidatePath('/payroll/run')
  revalidatePath('/projects')
}
