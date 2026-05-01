import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

// Handles Supabase auth callbacks (email confirmation, password reset redirects)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'signup', 'recovery', 'email', 'magiclink'

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const redirectPath = type === 'recovery' ? '/?reset=success' : '/'
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
    console.error('Auth callback error:', error.message)
  }

  return NextResponse.redirect(`${origin}/?auth=error`)
}
