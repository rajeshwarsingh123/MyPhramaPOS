import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

// Handles Supabase auth callbacks (email confirmation, password reset redirects)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'
  const type = searchParams.get('type') // 'signup', 'recovery', 'email', 'magiclink'

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If it's a password recovery, we should redirect to a path where they can change password
      // Since we don't have a dedicated /auth/reset-password page yet, 
      // we'll redirect back to the home page with a special query param
      const redirectPath = type === 'recovery' ? '/?auth=reset-password' : next
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
    console.error('Auth callback error:', error.message)
  }

  return NextResponse.redirect(`${origin}/?auth=error`)
}
