import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, adminSupabase, anonSupabase, hasServiceRoleKey } from '@/lib/supabase/server'
import { supabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otp } = body

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedOtp = otp.trim()

    if (normalizedOtp.length !== 6 || !/^\d{6}$/.test(normalizedOtp)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit code' }, { status: 400 })
    }

    let isVerified = false

    // ── Supabase Auth Verification ──
    if (isSupabaseConfigured && anonSupabase) {
      const { data, error: verifyError } = await anonSupabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedOtp,
        type: 'signup',
      })

      if (verifyError) {
        console.error('Supabase OTP verification failed:', verifyError)
      } else if (data.user) {
        isVerified = true
      }
    }

    // ── Local OTP Fallback (using Supabase table PasswordResetToken) ──
    let localToken = null
    if (!isVerified) {
      const { data } = await supabase
        .from('PasswordResetToken')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('otp', normalizedOtp)
        .eq('purpose', 'signup_verification')
        .eq('isUsed', false)
        .gte('expiresAt', new Date().toISOString())
        .order('createdAt', { ascending: false })
        .limit(1)
      
      if (data && data.length > 0) {
        localToken = data[0]
        isVerified = true
      }
    }

    if (!isVerified) {
      return NextResponse.json({ error: 'Invalid or expired verification code. Please check and try again.' }, { status: 401 })
    }

    // Find the tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('Tenant')
      .select('id, name, email, passwordHash, status')
      .eq('email', normalizedEmail)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Account not found. Please sign up again.' }, { status: 404 })
    }

    if (tenant.status !== 'pending_verification') {
      return NextResponse.json({ error: 'This account has already been verified.' }, { status: 400 })
    }

    // ── Confirm user in Supabase ──
    if (isSupabaseConfigured && hasServiceRoleKey && adminSupabase && tenant.passwordHash?.startsWith('supabase:')) {
      const supabaseUserId = tenant.passwordHash.replace('supabase:', '')
      const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(supabaseUserId, {
        email_confirm: true,
      })
      if (confirmError) console.error('Failed to confirm user in Supabase:', confirmError)
    }

    // ── Activate tenant in Supabase ──
    await supabase.from('Tenant').update({ status: 'trial' }).eq('id', tenant.id)

    await supabase.from('SystemLog').insert({
      tenantId: tenant.id,
      action: 'EMAIL_VERIFIED',
      details: `Tenant ${tenant.email} verified email via OTP`,
    })

    // Mark local token as used
    if (localToken) {
      await supabase.from('PasswordResetToken').update({ isUsed: true }).eq('id', localToken.id)
    }

    // Invalidate all remaining signup tokens for this email
    await supabase.from('PasswordResetToken').update({ isUsed: true }).match({ email: normalizedEmail, purpose: 'signup_verification', isUsed: false })

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
      name: tenant.name,
      email: tenant.email,
    })
  } catch (error) {
    console.error('POST /api/auth/verify-signup-otp error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
