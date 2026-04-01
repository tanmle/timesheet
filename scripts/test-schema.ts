import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  'https://sxtpaismhvfwdcyvkwis.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dHBhaXNtaHZmd2RjeXZrd2lzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg3NzU3NSwiZXhwIjoyMDkwNDUzNTc1fQ.gpdtibitnaR5Jyj8bHSARfFPJcbWFx8kF_QliasxkL4'
)

async function checkSchema() {
  const { data, error } = await admin.rpc('get_tables_and_columns_custom') // Doesn't exist normally
  // Instead, let's query raw REST API or just do standard table selects
  const tables = ['profiles', 'projects', 'time_entries', 'project_members', 'user_projects']
  
  for (const t of tables) {
     const { data, error } = await admin.from(t).select('*').limit(1)
     console.log(`Table ${t}:`, error ? error.message : Object.keys(data[0] || {}))
  }
}

checkSchema()
