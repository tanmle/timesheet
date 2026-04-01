'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function toggleEntryPaidStatus(entryId: string, currentlyPaid: boolean) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('time_entries')
    .update({ is_paid: !currentlyPaid })
    .eq('id', entryId)

  if (error) {
    throw new Error('Failed to update entry payment status')
  }

  revalidatePath('/payroll/run')
  revalidatePath('/payroll')
}

export async function processEmployeePayroll(
  empId: string, 
  empName: string, 
  totalHours: number, 
  totalAmount: number, 
  entryIds: string[]
) {
  const supabase = createAdminClient()

  // 1. Create a record in the 'payroll' table for history
  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  
  const { data: run, error: runError } = await supabase
    .from('payroll')
    .insert({
      month_name: `${empName} - ${monthName}`,
      total_amount: totalAmount,
      total_hours: totalHours,
      employee_count: 1,
      status: 'paid'
    })
    .select()
    .single()

  if (runError) {
    console.error('Run Error:', runError)
    throw new Error('Failed to create payroll history record')
  }

  // 2. Mark all those specific entries as paid and link to the run
  const { error: updateError } = await supabase
    .from('time_entries')
    .update({ 
      is_paid: true,
      payroll_id: run.id 
    })
    .in('id', entryIds)

  if (updateError) {
    console.error('Update Error:', updateError)
    throw new Error('Failed to mark entries as paid')
  }

  revalidatePath('/payroll/run')
  revalidatePath('/payroll')
  revalidatePath('/projects')
  return { success: true }
}
