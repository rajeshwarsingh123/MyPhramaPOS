import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured, adminSupabase, hasServiceRoleKey } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, newPassword } = body

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

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

    // ── Supabase: Admin API (service role key) — direct password update ──
    if (isSupabaseConfigured && hasServiceRoleKey && adminSupabase) {
      const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers({
        filters: { email: normalizedEmail },
      })

      if (!listError && usersData?.users?.length > 0) {
        const userId = usersData.users[0].id
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, { password: newPassword })

        if (!updateError) {
          // Update the appropriate local record
          if (tenant) {
            await db.tenant.update({ where: { id: tenant.id }, data: { passwordHash: `supabase:${userId}` } })
            await db.systemLog.create({
              data: { tenantId: tenant.id, action: 'PASSWORD_RESET', details: `Password reset via Supabase for tenant ${tenant.email}` },
            })
          }
          if (admin) {
            await db.admin.update({ where: { id: admin.id }, data: { password: `supabase:${userId}` } })
          }

          return NextResponse.json({
            success: true,
            message: 'Password has been reset successfully',
            authProvider: 'supabase',
            method: 'admin_api',
          })
        }
        console.error('Supabase updateUserById error:', updateError)
      }
    }

    // ── Supabase: Email-based reset (no service role key) ──
    if (isSupabaseConfigured) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/auth/callback`,
      })

      if (!resetError) {
        if (tenant) {
          await db.systemLog.create({
            data: { tenantId: tenant.id, action: 'PASSWORD_RESET', details: `Password reset email sent via Supabase for tenant ${tenant.email}` },
          })
        }
        return NextResponse.json({
          success: true,
          message: 'A password reset link has been sent to your email. Click the link to set a new password.',
          authProvider: 'supabase',
          method: 'email_link',
        })
      }
    }

    // ── Local Fallback ──
    if (tenant) {
      if (tenant.passwordHash.startsWith('supabase:')) {
        return NextResponse.json({ error: 'This account uses Supabase authentication. Please use the forgot password flow with email verification.' }, { status: 400 })
      }

      await db.tenant.update({ where: { id: tenant.id }, data: { passwordHash: newPassword } })
      await db.systemLog.create({
        data: { tenantId: tenant.id, action: 'PASSWORD_RESET', details: `Password reset (local) for tenant ${tenant.email}` },
      })

      return NextResponse.json({ success: true, message: 'Password has been reset successfully', authProvider: 'local' })
    }

    if (admin) {
      if (admin.email && admin.email === normalizedEmail) {
        const adminFull = await db.admin.findUnique({ where: { email: normalizedEmail }, select: { password: true } })
        if (adminFull && adminFull.password.startsWith('supabase:')) {
          return NextResponse.json({ error: 'This account uses Supabase authentication. Please use the forgot password flow with email verification.' }, { status: 400 })
        }

        await db.admin.update({ where: { id: admin.id }, data: { password: newPassword } })
        return NextResponse.json({ success: true, message: 'Password has been reset successfully', authProvider: 'local' })
      }
    }

    return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 })
  } catch (error) {
    console.error('POST /api/auth/forgot-password/reset error:', error)
    return NextResponse.json({ error: 'Password reset failed' }, { status: 500 })
  }
}
