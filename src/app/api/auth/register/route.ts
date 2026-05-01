import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, adminSupabase, hasServiceRoleKey } from '@/lib/supabase/server'
import { db } from '@/lib/db'

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
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // ── Supabase Auth Path (using admin API) ──
    if (isSupabaseConfigured && hasServiceRoleKey && adminSupabase) {
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
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

      const tenant = await db.tenant.create({
        data: {
          name: name.trim(), email: normalizedEmail, phone: phone.trim(),
          businessName: businessName.trim(), passwordHash: `supabase:${authData.user.id}`,
          plan: 'free', status: 'trial',
        },
      })

      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 30)
      await db.subscription.create({
        data: { tenantId: tenant.id, plan: 'free', amount: 0, status: 'active', startDate: new Date(), endDate: trialEnd },
      })

      await db.systemLog.create({
        data: { tenantId: tenant.id, action: 'SIGNUP', details: `New tenant registered via Supabase: ${tenant.email}` },
      })

      return NextResponse.json({
        id: tenant.id, name: tenant.name, email: tenant.email,
        businessName: tenant.businessName, phone: tenant.phone,
        plan: tenant.plan, status: tenant.status,
        emailConfirmationRequired: false,
        authProvider: 'supabase',
      })
    }

    // ── Local Fallback Path ──
    const tenant = await db.tenant.create({
      data: {
        name: name.trim(), email: normalizedEmail, phone: phone.trim(),
        businessName: businessName.trim(), passwordHash: password,
        plan: 'free', status: 'trial',
      },
    })

    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 30)
    await db.subscription.create({
      data: { tenantId: tenant.id, plan: 'free', amount: 0, status: 'active', startDate: new Date(), endDate: trialEnd },
    })

    await db.systemLog.create({
      data: { tenantId: tenant.id, action: 'SIGNUP', details: `New tenant registered (local): ${tenant.email}` },
    })

    return NextResponse.json({
      id: tenant.id, name: tenant.name, email: tenant.email,
      businessName: tenant.businessName, phone: tenant.phone,
      plan: tenant.plan, status: tenant.status,
      authProvider: 'local',
    })
  } catch (error) {
    console.error('POST /api/auth/register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
