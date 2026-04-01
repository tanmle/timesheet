'use server'

import { createClient } from '@/utils/supabase/server'

export async function getReportData(projectId: string | null, userId: string | null, month: number, year: number) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // SECURE: Enforce user data isolation
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('time_entries')
    .select('*, profiles(full_name, hourly_rate, exchange_rate), projects(name, rate, exchange_rate)')

  // ENFORCE USER DATA ISOLATION
  if (!isAdmin) {
    query = query.eq('user_id', user.id)
  } else if (userId && userId !== 'all') {
    query = query.eq('user_id', userId)
  }

  if (year > 0) {
    if (month > 0) {
      // Construction from year/month to avoid timezone shift from .toISOString()
      const startDay = new Date(year, month - 1, 1)
      const endDay = new Date(year, month, 0)
      
      const startOfMonth = `${startDay.getFullYear()}-${String(startDay.getMonth() + 1).padStart(2, '0')}-01`
      const endOfMonth = `${endDay.getFullYear()}-${String(endDay.getMonth() + 1).padStart(2, '0')}-${String(endDay.getDate()).padStart(2, '0')}`
      
      query = query.gte('date', startOfMonth).lte('date', endOfMonth)
    } else {
      const startOfYear = `${year}-01-01`
      const endOfYear = `${year}-12-31`
      query = query.gte('date', startOfYear).lte('date', endOfYear)
    }
  }

  if (projectId && projectId !== 'all') {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Report Fetch Error:', error)
    return { success: false, data: [], payrolls: [] }
  }

  // Fetch related payroll records (if any)
  const payrollIds = Array.from(new Set(data.map(e => e.payroll_id).filter(Boolean)))
  let payrolls: any[] = []
  
  if (payrollIds.length > 0) {
    const { data: pData } = await supabase
      .from('payroll')
      .select('*')
      .in('id', payrollIds)
      .order('created_at', { ascending: false })
    
    payrolls = pData || []
  }

  return { success: true, data, payrolls }
}
