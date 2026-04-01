import { createClient } from '@/utils/supabase/server'
import ProjectClient from './ProjectClient'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()
  
  // Fetch projects with their time entries and profiles to calculate economics
  const { data: projectsData, error } = await supabase
    .from('projects')
    .select('*, time_entries(*, profiles(hourly_rate, exchange_rate))')
    .order('created_at', { ascending: false })

  const projects = (projectsData || []).map(project => {
    let actualHours = 0
    let totalRevenue = 0
    let totalPaid = 0
    
    const projXRate = project.exchange_rate || 25000

    project.time_entries?.forEach((entry: any) => {
      // Only count work that has been finalized/paid in these specific metrics
      if (entry.is_paid) {
        const hours = entry.duration_minutes / 60
        actualHours += hours
        // Use the Project's specific exchange rate for both revenue and cost for this project's view
        totalRevenue += hours * (project.rate || 0) * projXRate
        totalPaid += hours * (entry.profiles?.hourly_rate || 0) * projXRate
      }
    })

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

  return (
    <div className="container">
      <ProjectClient projects={projects} globalStats={globalStats} />
    </div>
  )
}
