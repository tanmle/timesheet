import { createClient } from '@/utils/supabase/server'
import RunClient from './RunClient'

export const dynamic = 'force-dynamic'

export default async function PayrollDetailsPage({ searchParams }: { searchParams: Promise<{ user_id?: string, month?: string, year?: string }> }) {
  const supabase = await createClient()

  const { user_id, month, year } = await searchParams
  
  let query = supabase
    .from('time_entries')
    .select('*, projects(name, rate, exchange_rate, pricing_type, fixed_price), profiles!inner(id, full_name, avatar_url, hourly_rate, exchange_rate, pricing_type, fixed_salary, employment_type, bank_name, bank_number)')
    .eq('is_paid', false)

  // Filter by user if provided
  if (user_id) query = query.eq('user_id', user_id)

  // Filter by month/year if provided
  if (month !== undefined && year !== undefined) {
    const m = parseInt(month)
    const y = parseInt(year)
    const firstDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const lastDay = new Date(y, m + 1, 0).getDate()
    const lastDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    
    query = query.gte('date', firstDate).lte('date', lastDate)
  }

  const { data: entries = [] } = await query.order('date', { ascending: true })
  
  const unpaidEntries = entries || []

  // Group unpaid entries by employee
  const employeeData: Record<string, any> = {}
  
  let businessDaysInMonth = 22 // default fallback
  if (month !== undefined && year !== undefined) {
    const m = parseInt(month)
    const y = parseInt(year)
    let days = 0
    const d = new Date(y, m, 1)
    while (d.getMonth() === m) {
      if (d.getDay() !== 0 && d.getDay() !== 6) days++
      d.setDate(d.getDate() + 1)
    }
    businessDaysInMonth = days
  }

  unpaidEntries.forEach(entry => {
     const pId = entry.user_id
     if (!employeeData[pId]) {
       employeeData[pId] = { 
         profile: entry.profiles, 
         totalHours: 0, 
         totalAmountUSD: 0, 
         totalAmountVND: 0,
         isFixed: entry.profiles?.pricing_type === 'fixed',
         entries: [] 
       }
     }
     
     employeeData[pId].entries.push(entry)
     
     const hrs = entry.duration_minutes / 60
     employeeData[pId].totalHours += hrs

     if (entry.profiles?.pricing_type === 'fixed') {
       // Fixed salary is in VND
       const fixedSalaryVND = entry.profiles.fixed_salary || 0
       const exchangeRate = entry.profiles?.exchange_rate || 25000
       const uniqueDays = new Set(employeeData[pId].entries.map((e: any) => e.date)).size
       const proratedVND = fixedSalaryVND * (uniqueDays / businessDaysInMonth)
       employeeData[pId].totalAmountUSD = proratedVND / exchangeRate
       employeeData[pId].totalAmountVND = proratedVND
     } else {
       // Hourly: accumulate per entry
       const usdRate = entry.profiles.hourly_rate || 0
       const exchangeRate = entry.profiles?.exchange_rate || 25000
       employeeData[pId].totalAmountUSD += hrs * usdRate
       employeeData[pId].totalAmountVND += (hrs * usdRate) * exchangeRate
     }
  })

  return <RunClient employeeDataObj={employeeData} initialParams={{ user_id, month, year }} businessDaysInMonth={businessDaysInMonth} />
}
