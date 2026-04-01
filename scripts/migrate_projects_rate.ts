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
  console.log('Adding exchange_rate to projects table...')
  const { error } = await supabase.rpc('execute_sql', {
    sql: 'ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 25000;'
  })
  
  if (error) {
    // If RPC isn't enabled, we'll tell the user to run it themselves or maybe we don't have it.
    // Usually Supabase doesn't expose RPC for raw DDL by default.
    console.error('Migration Error:', error)
  } else {
    console.log('Success!')
  }
}

main().catch(console.error)
