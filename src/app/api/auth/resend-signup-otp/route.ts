import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, anonSupabase } from '@/lib/supabase/server'
import { supabase } from '@/lib/supabase/server'

function generateOTP(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0] % 1000000).toString().padStart(6, '0')
}

function maskEmail(email: string): string {
  const parts = email.split('@')
  return parts[0].slice(0, 2) + '***@' + parts[1]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check for rate limiting
    const { data: tokens } = await supabase
      .from('PasswordResetToken')
      .select('createdAt')
      .eq('email', normalizedEmail)
      .eq('purpose', 'signup_verification')
      .gte('createdAt', new Date(Date.now() - 60 * 1000).toISOString())
      .order('createdAt', { ascending: false })
      .limit(1)

    const recentToken = tokens && tokens.length > 0 ? tokens[0] : null

    if (recentToken) {
      const waitSeconds = Math.max(0, 60 - Math.floor((Date.now() - new Date(recentToken.createdAt).getTime()) / 1000))
      return NextResponse.json({
        error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        retryAfter: waitSeconds,
      }, { status: 429 })
    }

    // Find the pending tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('Tenant')
      .select('id, name, email, status')
      .eq('email', normalizedEmail)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'No pending account found with this email' }, { status: 404 })
    }

    if (tenant.status !== 'pending_verification') {
      return NextResponse.json({ error: 'This account has already been verified.' }, { status: 400 })
    }

    // Generate new OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Invalidate previous tokens
    await supabase.from('PasswordResetToken').update({ isUsed: true }).match({ email: normalizedEmail, purpose: 'signup_verification', isUsed: false })

    // Create new token
    const { error: tokenError } = await supabase.from('PasswordResetToken').insert({
      email: normalizedEmail,
      otp,
      userType: 'tenant',
      userId: tenant.id,
      purpose: 'signup_verification',
      expiresAt,
    })

    if (tokenError) throw tokenError

    // ── Supabase Auth Resend ──
    if (isSupabaseConfigured && anonSupabase) {
      const { error: resendError } = await anonSupabase.auth.resend({
        email: normalizedEmail,
        type: 'signup',
      })
      if (resendError) {
        console.error('Supabase OTP resend failed:', resendError)
        return NextResponse.json({ error: resendError.message }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code resent to your email.',
      maskedEmail: maskEmail(normalizedEmail),
      expiresIn: 600,
    })
  } catch (error) {
    console.error('POST /api/auth/resend-signup-otp error:', error)
    return NextResponse.json({ error: 'Failed to resend code' }, { status: 500 })
  }
}
