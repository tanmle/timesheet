import { createClient } from '@/utils/supabase/server'
import RunClient from './RunClient'

export const dynamic = 'force-dynamic'

export default async function PayrollDetailsPage() {
  const supabase = await createClient()

  const { data: entries = [] } = await supabase
    .from('time_entries')
    .select('*, projects(name, rate, exchange_rate), profiles!inner(id, full_name, avatar_url, hourly_rate, exchange_rate, bank_name, bank_number)')
    .order('created_at', { ascending: false })
  
  const unpaidEntries = entries?.filter(e => !e.is_paid) || []

  // Group unpaid entries by employee
  const employeeData: Record<string, any> = {}
  unpaidEntries.forEach(entry => {
     const pId = entry.user_id
     if (!employeeData[pId]) {
       employeeData[pId] = { 
         profile: entry.profiles, 
         totalHours: 0, 
         totalAmountUSD: 0, 
         totalAmountVND: 0,
         entries: [] 
       }
     }
     
     employeeData[pId].entries.push(entry)
     
     const hrs = entry.duration_minutes / 60
     const usdRate = entry.profiles.hourly_rate || 0
     
     // USE PROJECT X-RATE FIRST, THEN USER X-RATE
     const exchangeRate = entry.projects?.exchange_rate || entry.profiles?.exchange_rate || 25000

     employeeData[pId].totalHours += hrs
     employeeData[pId].totalAmountUSD += hrs * usdRate
     employeeData[pId].totalAmountVND += (hrs * usdRate) * exchangeRate
  })

  return <RunClient employeeDataObj={employeeData} />
}
