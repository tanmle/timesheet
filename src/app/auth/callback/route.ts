import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // If it's a recovery flow, prioritize the password update page
      if (type === 'recovery' || next.includes('recovery')) {
        const response = NextResponse.redirect(`${origin}/login/update-password`)
        return response
      }
      
      // Otherwise, redirect to the intended page
      const response = NextResponse.redirect(`${origin}${next}`)
      return response
    }
  }

  // Handle errors or missing code with a clear message
  return NextResponse.redirect(`${origin}/login?message=Authentication failed. Please try again.`)
}
