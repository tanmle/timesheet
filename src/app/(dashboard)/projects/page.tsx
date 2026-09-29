import { createClient } from '@/utils/supabase/server'
import ProjectClient from './ProjectClient'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()
  
  // Fetch projects with their time entries and profiles to calculate economics
  const { data: projectsData, error } = await supabase
    .from('projects')
    .select('*, time_entries(*, profiles(hourly_rate, exchange_rate, pricing_type))')
    .order('created_at', { ascending: false })

  const projects = (projectsData || []).map(project => {
    let actualHours = 0
    let totalRevenue = 0
    let totalPaid = 0
    
    const projXRate = project.exchange_rate || 25000

    project.time_entries?.forEach((entry: any) => {
      if (entry.is_paid) {
        const hours = entry.duration_minutes / 60
        actualHours += hours
        // Revenue: hourly projects accumulate per entry; fixed uses flat amount
        if (project.pricing_type !== 'fixed') {
          totalRevenue += hours * (project.rate || 0) * projXRate
        }
        // Cost: hourly members accumulate per entry; fixed members' cost handled at payroll level
        if (entry.profiles?.pricing_type !== 'fixed') {
          totalPaid += hours * (entry.profiles?.hourly_rate || 0) * projXRate
        }
      }
    })

    // For fixed-price projects, revenue is the flat fixed_price (now in VND)
    if (project.pricing_type === 'fixed') {
      totalRevenue = project.fixed_price || 0
    }

    return {
      ...project,
      actualHours,
      totalRevenue,
      totalPaid,
      totalProfit: totalRevenue - totalPaid
    }
  })

  // Global totals
  const globalStats = {
    totalRevenue: projects.reduce((acc, p) => acc + p.totalRevenue, 0),
    totalPaid: projects.reduce((acc, p) => acc + p.totalPaid, 0),
    totalProfit: projects.reduce((acc, p) => acc + p.totalProfit, 0),
    totalHours: projects.reduce((acc, p) => acc + p.actualHours, 0)
  }

  return <ProjectClient projects={projects} globalStats={globalStats} />
}
