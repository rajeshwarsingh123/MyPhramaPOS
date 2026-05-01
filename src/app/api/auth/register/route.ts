import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, adminSupabase, hasServiceRoleKey } from '@/lib/supabase/server'
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
    const { name, businessName, email, phone, password } = body

    if (!name || !businessName || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const existing = await db.tenant.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      // If already verified, reject
      if (existing.status !== 'pending_verification') {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      }
      // If pending verification, allow re-sending OTP
    }

    let tenantId = existing?.id
    let supabaseUserId: string | null = null

    // ── Supabase Auth Path ──
    if (isSupabaseConfigured && hasServiceRoleKey && adminSupabase) {
      // Check if user already exists in Supabase
      const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers({
        filters: { email: normalizedEmail },
      })

      if (!listError && usersData?.users?.length > 0) {
        supabaseUserId = usersData.users[0].id
      } else {
        // Create new Supabase user (unconfirmed)
        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: false,
          user_metadata: { name: name.trim(), businessName: businessName.trim(), phone: phone.trim(), role: 'tenant' },
        })

        if (authError) {
          if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
          }
          return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        if (!authData.user) {
          return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
        }

        supabaseUserId = authData.user.id
      }
    }

    // ── Create or update Tenant record in local DB ──
    if (tenantId) {
      // Update existing pending tenant
      await db.tenant.update({
        where: { id: tenantId },
        data: {
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
          passwordHash: supabaseUserId ? `supabase:${supabaseUserId}` : password,
          status: 'pending_verification',
        },
      })
    } else {
      // Create new tenant
      const tenant = await db.tenant.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: phone.trim(),
          businessName: businessName.trim(),
          passwordHash: supabaseUserId ? `supabase:${supabaseUserId}` : password,
          plan: 'free',
          status: 'pending_verification',
        },
      })
      tenantId = tenant.id

      // Create subscription (trial starts after verification)
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 30)
      await db.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: 'free',
          amount: 0,
          status: 'active',
          startDate: new Date(),
          endDate: trialEnd,
        },
      })

      await db.systemLog.create({
        data: {
          tenantId: tenant.id,
          action: 'SIGNUP',
          details: `New tenant registered (pending verification): ${tenant.email}`,
        },
      })
    }

    // ── Generate OTP ──
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Invalidate previous signup OTPs for this email
    await db.passwordResetToken.updateMany({
      where: {
        email: normalizedEmail,
        purpose: 'signup_verification',
        isUsed: false,
      },
      data: { isUsed: true },
    })

    // Create new OTP token
    await db.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        otp,
        userType: 'tenant',
        userId: tenantId,
        purpose: 'signup_verification',
        expiresAt,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Account created. Please verify your email.',
      maskedEmail: maskEmail(normalizedEmail),
      name: name.trim(),
      // OTP returned for testing — in production, send via Supabase email
      otp,
      expiresIn: 600,
    })
  } catch (error) {
    console.error('POST /api/auth/register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
