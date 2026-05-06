import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, adminSupabase, hasServiceRoleKey, supabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Find admin in Supabase 'Admin' table
    const { data: admin, error: dbError } = await supabase
      .from('Admin')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (dbError || !admin) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!admin.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 })
    }

    // ── Supabase Auth Path (using admin API) ──
    if (isSupabaseConfigured && hasServiceRoleKey && adminSupabase) {
      // Find user in Supabase Auth
      const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers({
        filters: { email: normalizedEmail },
      })

      if (listError || !usersData?.users?.length) {
        // User not in Supabase Auth — auto-create with admin API
        const { data: newUserData, error: createError } = await adminSupabase.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: { name: admin.name, role: admin.role },
        })

        if (!createError && newUserData.user) {
          // Update local DB reference (lastLogin)
          await supabase
            .from('Admin')
            .update({ password: `supabase:${newUserData.user.id}`, lastLogin: new Date().toISOString() })
            .eq('id', admin.id)

          return NextResponse.json({
            id: admin.id, name: admin.name, email: admin.email,
            role: admin.role, lastLogin: new Date(), authProvider: 'supabase',
          })
        }

        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      // User exists in Supabase Auth — update password
      const userId = usersData.users[0].id

      const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
        user_metadata: { name: admin.name, role: admin.role },
      })

      if (updateError) {
        console.error('Supabase updateUserById error:', updateError.message)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      // Update lastLogin in 'Admin' table
      await supabase
        .from('Admin')
        .update({ password: `supabase:${userId}`, lastLogin: new Date().toISOString() })
        .eq('id', admin.id)

      return NextResponse.json({
        id: admin.id, name: admin.name, email: admin.email,
        role: admin.role, lastLogin: new Date(), authProvider: 'supabase',
      })
    }

    // ── Local Fallback Path (if Supabase Auth not used for this account) ──
    if (admin.password.startsWith('supabase:')) {
      return NextResponse.json({ error: 'This account uses Supabase authentication. Please configure Supabase.' }, { status: 401 })
    }

    if (admin.password !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    await supabase
      .from('Admin')
      .update({ lastLogin: new Date().toISOString() })
      .eq('id', admin.id)

    return NextResponse.json({
      id: admin.id, name: admin.name, email: admin.email,
      role: admin.role, lastLogin: new Date(), authProvider: 'local',
    })
  } catch (error) {
    console.error('POST /api/admin/auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
