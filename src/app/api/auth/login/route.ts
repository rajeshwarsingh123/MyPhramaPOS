import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, anonSupabase, supabase } from '@/lib/supabase/server'

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
        // Only allow tenants in this login route
        const { data: adminRecord } = await supabase
          .from('Admin')
          .select('id')
          .eq('email', normalizedEmail)
          .single()

        if (adminRecord) {
          return NextResponse.json({ error: 'Admin accounts must use the Admin Panel' }, { status: 403 })
        }

        // Success! Return tenant data
        const response = NextResponse.json({
          id: data.user.id,
          name: data.user.user_metadata?.name || 'User',
          email: data.user.email,
          businessName: data.user.user_metadata?.businessName || 'Pharmacy',
          phone: data.user.user_metadata?.phone || '',
          role: data.user.user_metadata?.role || 'tenant',
          userType: 'tenant',
          authProvider: 'supabase',
          status: 'active',
          plan: 'pro',
        })

        // Set tenantId cookie
        response.cookies.set('tenantId', data.user.id, { path: '/', httpOnly: false, maxAge: 60 * 60 * 24 * 7 })

        return response
      }

      // If Supabase auth failed with "Invalid login credentials", stop here
      if (authError && (authError.message.includes('Invalid login credentials') || authError.status === 400)) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }
    }

    // ── Local Fallback (Tenants Only) ──
    // Check Tenant table
    const { data: tenant } = await supabase
      .from('Tenant')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (tenant && tenant.passwordHash === password) {
      const response = NextResponse.json({
        id: tenant.id, name: tenant.name, email: tenant.email,
        businessName: tenant.businessName, phone: tenant.phone,
        plan: tenant.plan, status: tenant.status,
        authProvider: 'local',
        userType: 'tenant',
      })
      response.cookies.set('tenantId', tenant.id, { path: '/', httpOnly: false, maxAge: 60 * 60 * 24 * 7 })
      return response
    }

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  } catch (error) {
    console.error('POST /api/auth/login error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
