'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getNextInvoiceNumber(): Promise<number> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('invoice_number', { ascending: false })
    .limit(1)

  if (data && data.length > 0) {
    return data[0].invoice_number + 1
  }
  return 1
}

export async function getInvoiceHistory() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch invoices')
  return data || []
}

export async function saveInvoice(invoice: {
  invoiceNumber: number
  senderName: string
  billTo: string
  invoiceDate: string
  dateRangeStr: string
  items: { name: string; quantity: number; rate: number; amount: number }[]
  subtotal: number
  taxRate: number
  total: number
  notes: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('invoices').insert({
    invoice_number: invoice.invoiceNumber,
    sender_name: invoice.senderName,
    bill_to: invoice.billTo,
    invoice_date: invoice.invoiceDate,
    date_range_str: invoice.dateRangeStr,
    items: invoice.items,
    subtotal: invoice.subtotal,
    tax_rate: invoice.taxRate,
    total: invoice.total,
    notes: invoice.notes,
    created_by: user.id,
  })

  if (error) {
    console.error('Save invoice error:', error)
    throw new Error('Failed to save invoice')
  }

  revalidatePath('/invoice')
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)

  if (error) throw new Error('Failed to delete invoice')

  revalidatePath('/invoice')
}

export async function toggleInvoicePaid(invoiceId: string, isPaid: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invoices')
    .update({ is_paid: isPaid })
    .eq('id', invoiceId)

  if (error) throw new Error('Failed to update invoice status')

  revalidatePath('/invoice')
}
