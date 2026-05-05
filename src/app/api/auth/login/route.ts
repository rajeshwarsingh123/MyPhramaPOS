import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, adminSupabase, anonSupabase, hasServiceRoleKey } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // ── Supabase Auth Login Path (Primary) ──
    if (isSupabaseConfigured && anonSupabase) {
      const { data, error: authError } = await anonSupabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      })

      if (!authError && data.user) {
        const userMetadata = data.user.user_metadata || {}
        const isUserAdmin = userMetadata.role === 'admin'

        // Success! Return user data from Supabase session
        return NextResponse.json({
          id: data.user.id,
          name: userMetadata.name || 'User',
          email: data.user.email,
          businessName: userMetadata.businessName || 'Pharmacy',
          phone: userMetadata.phone || '',
          role: userMetadata.role || 'tenant',
          userType: isUserAdmin ? 'admin' : 'tenant',
          authProvider: 'supabase',
          status: 'active',
          plan: 'free',
        })
      }

      // If Supabase auth failed with "Invalid login credentials", stop here
      if (authError && (authError.message.includes('Invalid login credentials') || authError.status === 400)) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }
    }

    // ── Local Fallback (Only if Supabase is not configured or specific local-only users) ──
    const admin = await db.admin.findUnique({ where: { email: normalizedEmail } }).catch(() => null)
    if (admin && admin.password === password) {
       return NextResponse.json({
        id: admin.id, name: admin.name, email: admin.email,
        role: admin.role, lastLogin: new Date(), authProvider: 'local',
        userType: 'admin',
      })
    }

    const tenant = await db.tenant.findUnique({ where: { email: normalizedEmail } }).catch(() => null)
    if (tenant && tenant.passwordHash === password) {
      return NextResponse.json({
        id: tenant.id, name: tenant.name, email: tenant.email,
        businessName: tenant.businessName, phone: tenant.phone,
        plan: tenant.plan, status: tenant.status,
        authProvider: 'local',
        userType: 'tenant',
      })
    }

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  } catch (error) {
    console.error('POST /api/auth/login error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
