import { getAuthUser } from '@/utils/getAuthUser'
import { redirect } from 'next/navigation'
import { getNextInvoiceNumber, getInvoiceHistory } from './actions'
import InvoiceClient from './InvoiceClient'

export const dynamic = 'force-dynamic'

export default async function InvoicePage() {
  const profile = await getAuthUser()
  if (!profile) return null

  if (profile.role !== 'admin') {
    redirect('/')
  }

  const [nextNumber, history] = await Promise.all([
    getNextInvoiceNumber(),
    getInvoiceHistory(),
  ])

  return <InvoiceClient nextInvoiceNumber={nextNumber} invoiceHistory={history} />
}
