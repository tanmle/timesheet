import { getAuthUser } from '@/utils/getAuthUser'
import { redirect } from 'next/navigation'
import { getCVs } from './actions'
import CVClient from './CVClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'CV Builder - Personal Timesheet',
  description: 'Create and edit professional CVs based on reference template',
}

export default async function CVPage() {
  const profile = await getAuthUser()
  if (!profile) {
    redirect('/login')
  }

  // Only admin can access this page
  if (profile.role !== 'admin') {
    redirect('/')
  }

  const res = await getCVs()

  return <CVClient initialCVs={res.data || []} />
}
