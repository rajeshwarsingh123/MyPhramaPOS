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
        // Check if this user exists in the Admin table regardless of Supabase metadata
        const { data: adminRecord } = await supabase
          .from('Admin')
          .select('*')
          .eq('email', normalizedEmail)
          .single()

        const isUserAdmin = !!adminRecord || data.user.user_metadata?.role === 'admin'
        const role = adminRecord?.role || data.user.user_metadata?.role || 'tenant'

        // Success! Return user data
        const response = NextResponse.json({
          id: adminRecord?.id || data.user.id,
          name: adminRecord?.name || data.user.user_metadata?.name || 'User',
          email: data.user.email,
          businessName: data.user.user_metadata?.businessName || 'Pharmacy',
          phone: data.user.user_metadata?.phone || '',
          role: role,
          userType: isUserAdmin ? 'admin' : 'tenant',
          authProvider: 'supabase',
          status: 'active',
          plan: 'pro',
        })

        // Set cookie for session persistence
        if (isUserAdmin) {
          response.cookies.set('adminId', adminRecord?.id || data.user.id, { path: '/', httpOnly: false, maxAge: 60 * 60 * 24 * 7 })
        } else {
          response.cookies.set('tenantId', data.user.id, { path: '/', httpOnly: false, maxAge: 60 * 60 * 24 * 7 })
        }

        return response
      }

      // If Supabase auth failed with "Invalid login credentials", stop here
      if (authError && (authError.message.includes('Invalid login credentials') || authError.status === 400)) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }
    }

    // ── Local Fallback (Using Supabase 'Admin' and 'Tenant' tables instead of Prisma) ──
    // Check Admin table
    const { data: admin } = await supabase
      .from('Admin')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (admin && admin.password === password) {
       const response = NextResponse.json({
        id: admin.id, name: admin.name, email: admin.email,
        role: admin.role, lastLogin: new Date(), authProvider: 'local',
        userType: 'admin',
      })
      response.cookies.set('adminId', admin.id, { path: '/', httpOnly: false, maxAge: 60 * 60 * 24 * 7 })
      return response
    }

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
