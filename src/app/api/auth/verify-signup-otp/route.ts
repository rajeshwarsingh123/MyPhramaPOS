import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, adminSupabase, anonSupabase, hasServiceRoleKey } from '@/lib/supabase/server'
import { db } from '@/lib/db'

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
        // Fallback to local OTP check below if Supabase fails (optional)
      } else if (data.user) {
        isVerified = true
      }
    }

    // ── Local OTP Fallback (if not already verified by Supabase) ──
    let token = null
    if (!isVerified) {
      token = await db.passwordResetToken.findFirst({
        where: {
          email: normalizedEmail,
          otp: normalizedOtp,
          purpose: 'signup_verification',
          isUsed: false,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (token) isVerified = true
    }

    if (!isVerified) {
      return NextResponse.json({ error: 'Invalid or expired verification code. Please check and try again.' }, { status: 401 })
    }

    // Find the tenant
    const tenant = await db.tenant.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, passwordHash: true, status: true },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Account not found. Please sign up again.' }, { status: 404 })
    }

    if (tenant.status !== 'pending_verification') {
      return NextResponse.json({ error: 'This account has already been verified.' }, { status: 400 })
    }

    // ── Confirm user in Supabase ──
    if (isSupabaseConfigured && hasServiceRoleKey && adminSupabase && tenant.passwordHash.startsWith('supabase:')) {
      const supabaseUserId = tenant.passwordHash.replace('supabase:', '')

      const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(supabaseUserId, {
        email_confirm: true,
      })

      if (confirmError) {
        console.error('Failed to confirm user in Supabase:', confirmError)
        // Still proceed with local verification even if Supabase confirmation fails
      }
    }

    // ── Activate tenant in local DB ──
    await db.tenant.update({
      where: { id: tenant.id },
      data: { status: 'trial' },
    })

    await db.systemLog.create({
      data: {
        tenantId: tenant.id,
        action: 'EMAIL_VERIFIED',
        details: `Tenant ${tenant.email} verified email via OTP`,
      },
    })

    // Mark local token as used if it was found
    if (token) {
      await db.passwordResetToken.update({
        where: { id: token.id },
        data: { isUsed: true },
      })
    }

    // Invalidate all remaining signup tokens for this email
    await db.passwordResetToken.updateMany({
      where: { email: normalizedEmail, purpose: 'signup_verification', isUsed: false },
      data: { isUsed: true },
    })

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
