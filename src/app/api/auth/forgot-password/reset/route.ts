import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured, adminSupabase, hasServiceRoleKey } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otp, newPassword, tokenId } = body

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, verification code and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedOtp = otp.trim()

    // ── Validate OTP token ──
    const token = await db.passwordResetToken.findFirst({
      where: {
        email: normalizedEmail,
        otp: normalizedOtp,
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!token) {
      return NextResponse.json({ error: 'Invalid or expired verification code. Please request a new one.' }, { status: 401 })
    }

    // ── Check both Admin and Tenant tables ──
    const [admin, tenant] = await Promise.all([
      db.admin.findUnique({ where: { email: normalizedEmail }, select: { id: true, name: true, email: true, role: true, isActive: true } }),
      db.tenant.findUnique({ where: { email: normalizedEmail }, select: { id: true, name: true, email: true, status: true, passwordHash: true } }),
    ])

    if (!admin && !tenant) {
      return NextResponse.json({ error: 'No account found with this email address' }, { status: 404 })
    }

    // Check suspended/deactivated status
    if (tenant?.status === 'suspended') {
      return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
    }
    if (admin && !admin.isActive) {
      return NextResponse.json({ error: 'Your account has been deactivated.' }, { status: 403 })
    }

    // ── Update password ──
    let resetSuccess = false

    // Supabase: Admin API (service role key) — direct password update
    if (isSupabaseConfigured && hasServiceRoleKey && adminSupabase) {
      const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers({
        filters: { email: normalizedEmail },
      })

      if (!listError && usersData?.users?.length > 0) {
        const userId = usersData.users[0].id
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, { password: newPassword })

        if (!updateError) {
          if (tenant) {
            await db.tenant.update({ where: { id: tenant.id }, data: { passwordHash: `supabase:${userId}` } })
            await db.systemLog.create({
              data: { tenantId: tenant.id, action: 'PASSWORD_RESET', details: `Password reset via OTP verification for tenant ${tenant.email}` },
            })
          }
          if (admin) {
            await db.admin.update({ where: { id: admin.id }, data: { password: `supabase:${userId}` } })
          }
          resetSuccess = true
        }
        console.error('Supabase updateUserById error:', updateError)
      }
    }

    // Local Fallback
    if (!resetSuccess) {
      if (tenant) {
        await db.tenant.update({ where: { id: tenant.id }, data: { passwordHash: newPassword } })
        await db.systemLog.create({
          data: { tenantId: tenant.id, action: 'PASSWORD_RESET', details: `Password reset via OTP verification (local) for tenant ${tenant.email}` },
        })
        resetSuccess = true
      }

      if (admin) {
        await db.admin.update({ where: { id: admin.id }, data: { password: newPassword } })
        resetSuccess = true
      }
    }

    if (!resetSuccess) {
      return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 })
    }

    // Mark token as used
    await db.passwordResetToken.update({
      where: { id: token.id },
      data: { isUsed: true },
    })

    // Invalidate all remaining tokens for this email
    await db.passwordResetToken.updateMany({
      where: { email: normalizedEmail, isUsed: false },
      data: { isUsed: true },
    })

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    })
  } catch (error) {
    console.error('POST /api/auth/forgot-password/reset error:', error)
    return NextResponse.json({ error: 'Password reset failed' }, { status: 500 })
  }
}
