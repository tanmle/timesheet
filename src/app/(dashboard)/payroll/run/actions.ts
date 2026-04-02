'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/utils/notifications'

export async function toggleEntryPaidStatus(entryId: string, currentlyPaid: boolean) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('time_entries')
    .update({ is_paid: !currentlyPaid })
    .eq('id', entryId)

  if (error) {
    throw new Error('Failed to update entry payment status')
  }

  // Notify the user about the payment status update
  if (!currentlyPaid) { // Only notify if we just marked it as PAID
    const { data: entry } = await supabase
      .from('time_entries')
      .select('user_id, date')
      .eq('id', entryId)
      .single()

    if (entry) {
      await createNotification({
        userId: entry.user_id,
        title: 'Entry Paid ✅',
        message: `Your entry for ${new Date(entry.date).toLocaleDateString()} has been marked as paid.`,
        type: 'success'
      })
    }
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

  // Notify the employee
  await createNotification({
    userId: empId,
    title: 'Payroll Paid! 💰',
    message: `Your payroll for ${monthName} has been processed: ${totalAmount.toLocaleString()}đ.`,
    type: 'payment'
  })

  revalidatePath('/payroll/run')
  revalidatePath('/payroll')
  revalidatePath('/projects')
  return { success: true }
}
