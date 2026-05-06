import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured, adminSupabase, anonSupabase, hasServiceRoleKey } from '@/lib/supabase/server'

function generateOTP(): string {
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

    // ── Get User (Tenant or Admin) ──
    const { data: tenant } = await supabase
      .from('Tenant')
      .select('id, name, email, status')
      .eq('email', normalizedEmail)
      .maybeSingle()

    const { data: admin } = await supabase
      .from('Admin')
      .select('id, name, email, role, isActive')
      .eq('email', normalizedEmail)
      .maybeSingle()

    // Account not found — return found: false so frontend can guide user
    if (!tenant && !admin) {
      return NextResponse.json({
        found: false,
        message: 'No account found with this email address',
      }, { status: 200 })
    }

    const isSuspended = tenant?.status === 'suspended' || (admin && !admin.isActive)
    if (isSuspended) {
      return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
    }

    // ── Supabase Reset Email ──
    if (isSupabaseConfigured) {
      // 1. Ensure user exists in Supabase Auth (Auto-sync if missing)
      if (adminSupabase && hasServiceRoleKey) {
        const { data: usersData } = await adminSupabase.auth.admin.listUsers({
          filters: { email: normalizedEmail },
        })

        if (!usersData?.users || usersData.users.length === 0) {
          // User missing in Supabase, create them now so reset link works
          const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
          await adminSupabase.auth.admin.createUser({
            email: normalizedEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              name: tenant?.name || admin?.name || 'User',
              role: admin ? 'admin' : 'tenant',
            },
          })
          console.log(`Auto-created user ${normalizedEmail} in Supabase for password reset`)
        }
      }

      // 2. Trigger the reset email
      const { error: resetError } = await (anonSupabase || supabase).auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${new URL(request.url).origin}/`,
      })
      if (resetError) {
        console.error('Supabase resetPasswordForEmail error:', resetError)
      }
    }

    // ── Check for recent OTP (prevent spam) ──
    const { data: recentToken } = await supabase
      .from('PasswordResetToken')
      .select('createdAt')
      .eq('email', normalizedEmail)
      .gte('createdAt', new Date(Date.now() - 10 * 1000).toISOString())
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentToken) {
      const waitSeconds = Math.max(0, 60 - Math.floor((Date.now() - new Date(recentToken.createdAt).getTime()) / 1000))
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
    await supabase
      .from('PasswordResetToken')
      .update({ isUsed: true })
      .eq('email', normalizedEmail)
      .eq('isUsed', false)

    // Create new token (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    await supabase
      .from('PasswordResetToken')
      .insert({
        email: normalizedEmail,
        otp,
        userType,
        userId: userId || null,
        expiresAt,
        isUsed: false,
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
      otp, // Frontend will use this to pre-fill and skip verification
      expiresIn: 600,
    })
  } catch (error) {
    console.error('POST /api/auth/forgot-password/verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
