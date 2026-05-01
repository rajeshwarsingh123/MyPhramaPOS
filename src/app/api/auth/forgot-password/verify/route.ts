import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function generateOTP(): string {
  // Generate a cryptographically random 6-digit OTP
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0] % 1000000).toString().padStart(6, '0')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const [tenant, admin] = await Promise.all([
      db.tenant.findUnique({ where: { email: normalizedEmail }, select: { id: true, name: true, email: true, status: true } }),
      db.admin.findUnique({ where: { email: normalizedEmail }, select: { id: true, name: true, email: true, role: true, isActive: true } }),
    ])

    if (!tenant && !admin) {
      return NextResponse.json({ error: 'No account found with this email address' }, { status: 404 })
    }

    const isSuspended = tenant?.status === 'suspended' || (admin && !admin.isActive)
    if (isSuspended) {
      return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
    }

    // ── Check for recent OTP (prevent spam) ──
    const recentToken = await db.passwordResetToken.findFirst({
      where: {
        email: normalizedEmail,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) }, // within last 60 seconds
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

    // ── Generate and store OTP ──
    const otp = generateOTP()
    const userType = admin ? 'admin' : 'tenant'
    const userId = admin?.id || tenant?.id

    // Invalidate all previous tokens for this email
    await db.passwordResetToken.updateMany({
      where: { email: normalizedEmail, isUsed: false },
      data: { isUsed: true },
    })

    // Create new token (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await db.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        otp,
        userType,
        userId: userId || null,
        expiresAt,
      },
    })

    const emailParts = normalizedEmail.split('@')
    const maskedEmail = emailParts[0].slice(0, 2) + '***@' + emailParts[1]
    const userName = tenant?.name || admin?.name || ''

    return NextResponse.json({
      found: true,
      maskedEmail,
      name: userName,
      isAdmin: !!admin,
      isTenant: !!tenant,
      userType,
      // OTP is returned here for demo/testing — in production, send via email
      otp,
      expiresIn: 600, // 10 minutes in seconds
    })
  } catch (error) {
    console.error('POST /api/auth/forgot-password/verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
