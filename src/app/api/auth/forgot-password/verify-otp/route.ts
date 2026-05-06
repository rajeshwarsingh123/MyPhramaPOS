import { NextRequest, NextResponse } from 'next/server'
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

    // Find valid token
    const { data: token } = await supabase
      .from('PasswordResetToken')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('otp', normalizedOtp)
      .eq('isUsed', false)
      .gte('expiresAt', new Date().toISOString())
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!token) {
      // Check if expired
      const { data: expiredToken } = await supabase
        .from('PasswordResetToken')
        .select('id')
        .eq('email', normalizedEmail)
        .eq('otp', normalizedOtp)
        .eq('isUsed', false)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (expiredToken) {
        return NextResponse.json({ error: 'This verification code has expired. Please request a new one.' }, { status: 410 })
      }

      return NextResponse.json({ error: 'Invalid verification code. Please check and try again.' }, { status: 401 })
    }

    // Mark token as verified (not used yet — used after password reset)
    return NextResponse.json({
      verified: true,
      tokenId: token.id,
      email: token.email,
      userType: token.userType,
      userId: token.userId,
      message: 'Code verified successfully',
    })
  } catch (error) {
    console.error('POST /api/auth/forgot-password/verify-otp error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
