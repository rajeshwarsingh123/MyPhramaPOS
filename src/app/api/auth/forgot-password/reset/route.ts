import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured, adminSupabase, hasServiceRoleKey } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otp, newPassword } = body

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, verification code and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedOtp = otp.trim()

    // ── Validate OTP token ──
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
      return NextResponse.json({ error: 'Invalid or expired verification code. Please request a new one.' }, { status: 401 })
    }

    // ── Check both Admin and Tenant tables ──
    const { data: admin } = await supabase
      .from('Admin')
      .select('id, name, email, role, isActive')
      .eq('email', normalizedEmail)
      .maybeSingle()

    const { data: tenant } = await supabase
      .from('Tenant')
      .select('id, name, email, status, passwordHash')
      .eq('email', normalizedEmail)
      .maybeSingle()

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

      if (!listError && usersData?.users && usersData.users.length > 0) {
        const userId = usersData.users[0].id
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, { password: newPassword })

        if (!updateError) {
          if (tenant) {
            await supabase.from('Tenant').update({ passwordHash: `supabase:${userId}` }).eq('id', tenant.id)
            await supabase.from('SystemLog').insert({ 
              tenantId: tenant.id, 
              action: 'PASSWORD_RESET', 
              details: `Password reset via OTP verification for tenant ${tenant.email}` 
            })
          }
          if (admin) {
            await supabase.from('Admin').update({ password: `supabase:${userId}` }).eq('id', admin.id)
          }
          resetSuccess = true
        } else {
          console.error('Supabase updateUserById error:', updateError)
        }
      }
    }

    // Local Fallback
    if (!resetSuccess) {
      if (tenant) {
        await supabase.from('Tenant').update({ passwordHash: newPassword }).eq('id', tenant.id)
        await supabase.from('SystemLog').insert({ 
          tenantId: tenant.id, 
          action: 'PASSWORD_RESET', 
          details: `Password reset via OTP verification (local) for tenant ${tenant.email}` 
        })
        resetSuccess = true
      }

      if (admin) {
        await supabase.from('Admin').update({ password: newPassword }).eq('id', admin.id)
        resetSuccess = true
      }
    }

    if (!resetSuccess) {
      return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 })
    }

    // Invalidate all tokens for this email
    await supabase
      .from('PasswordResetToken')
      .update({ isUsed: true })
      .eq('email', normalizedEmail)

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    })
  } catch (error) {
    console.error('POST /api/auth/forgot-password/reset error:', error)
    return NextResponse.json({ error: 'Password reset failed' }, { status: 500 })
  }
}
