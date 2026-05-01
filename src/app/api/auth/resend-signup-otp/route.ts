import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    // Check for rate limiting (prevent spam)
    const recentToken = await db.passwordResetToken.findFirst({
      where: {
        email: normalizedEmail,
        purpose: 'signup_verification',
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentToken) {
      const waitSeconds = Math.max(0, 60 - Math.floor((Date.now() - recentToken.createdAt.getTime()) / 1000))
      return NextResponse.json({
        error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        retryAfter: waitSeconds,
      }, { status: 429 })
    }

    // Find the pending tenant
    const tenant = await db.tenant.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, status: true },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'No pending account found with this email' }, { status: 404 })
    }

    if (tenant.status !== 'pending_verification') {
      return NextResponse.json({ error: 'This account has already been verified.' }, { status: 400 })
    }

    // Generate new OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Invalidate previous tokens
    await db.passwordResetToken.updateMany({
      where: {
        email: normalizedEmail,
        purpose: 'signup_verification',
        isUsed: false,
      },
      data: { isUsed: true },
    })

    // Create new token
    await db.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        otp,
        userType: 'tenant',
        userId: tenant.id,
        purpose: 'signup_verification',
        expiresAt,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Verification code resent.',
      maskedEmail: maskEmail(normalizedEmail),
      // OTP returned for testing — in production, send via email
      otp,
      expiresIn: 600,
    })
  } catch (error) {
    console.error('POST /api/auth/resend-signup-otp error:', error)
    return NextResponse.json({ error: 'Failed to resend code' }, { status: 500 })
  }
}
