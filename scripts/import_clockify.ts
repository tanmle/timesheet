import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Manually load .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=')
    if (key && value.length > 0) {
      process.env[key.trim()] = value.join('=').trim()
    }
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const dataPath = path.join(process.cwd(), 'clockify_data_export.json')
  const clockifyData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

  // 1. Fetch current DB state
  const { data: dbProfiles } = await supabase.from('profiles').select('id, full_name')
  const { data: dbProjects } = await supabase.from('projects').select('id, name')

  const profileMap = new Map((dbProfiles || []).map(p => [p.full_name, p.id]))
  const projectMap = new Map((dbProjects || []).map(p => [p.name, p.id]))

  console.log('--- Current Profiles in DB ---')
  console.log(dbProfiles)
  console.log('--- Current Projects in DB ---')
  console.log(dbProjects)

  const workspace = clockifyData.workspaces[0]
  const clockifyEntries = workspace.timeEntries

  // 2. Map Projects
  for (const cp of workspace.projects) {
    if (!projectMap.has(cp.name)) {
      console.log(`Creating project: ${cp.name}`)
      const { data: newProj, error } = await supabase
        .from('projects')
        .insert({ name: cp.name, rate: cp.hourlyRate?.amount / 100 || 0 })
        .select()
        .single()
      
      if (newProj) {
        projectMap.set(newProj.name, newProj.id)
      }
    }
  }

  // 3. Migrate Entries
  console.log(`Processing ${clockifyEntries.length} entries...`)
  let successCount = 0
  let skipCount = 0

  for (const entry of clockifyEntries) {
    const userId = profileMap.get(entry.userName)
    const projectId = projectMap.get(entry.projectName)

    if (!userId) {
      console.warn(`User not found in DB: ${entry.userName}. Skipping.`)
      skipCount++
      continue
    }

    if (!projectId) {
      console.warn(`Project not found/created: ${entry.projectName}. Skipping.`)
      skipCount++
      continue
    }

    const { data: existing } = await supabase
      .from('time_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('date', entry.timeInterval.start.split('T')[0])
      .eq('duration_minutes', Math.round(entry.timeInterval.duration / 60))
      .eq('task_description', entry.description || 'No description')
      .limit(1)

    if (existing && existing.length > 0) {
      skipCount++
      continue
    }

    const { error: insertError } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        project_id: projectId,
        task_description: entry.description || 'No description',
        date: entry.timeInterval.start.split('T')[0],
        duration_minutes: Math.round(entry.timeInterval.duration / 60),
        is_paid: true
      })

    if (insertError) {
      console.error('Insert Error:', insertError)
    } else {
      successCount++
    }
  }

  console.log(`Migration Finished!`)
  console.log(`Success: ${successCount}`)
  console.log(`Skipped (Duplicates or Missing mappings): ${skipCount}`)
}

main().catch(console.error)
