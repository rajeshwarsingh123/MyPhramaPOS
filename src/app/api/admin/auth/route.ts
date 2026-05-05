import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, adminSupabase, hasServiceRoleKey } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const admin = await db.admin.findUnique({ where: { email: normalizedEmail } })
    if (!admin) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!admin.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 })
    }

    // ── Supabase Auth Path (using admin API) ──
    if (isSupabaseConfigured && hasServiceRoleKey && adminSupabase) {
      // Find user in Supabase
      const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers({
        filters: { email: normalizedEmail },
      })

      if (listError || !usersData?.users?.length) {
        // User not in Supabase — auto-create with admin API
        const { data: newUserData, error: createError } = await adminSupabase.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: { name: admin.name, role: admin.role },
        })

        if (!createError && newUserData.user) {
          await db.admin.update({
            where: { id: admin.id },
            data: { password: `supabase:${newUserData.user.id}`, lastLogin: new Date() },
          })
          return NextResponse.json({
            id: admin.id, name: admin.name, email: admin.email,
            role: admin.role, lastLogin: new Date(), authProvider: 'supabase',
          })
        }

        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      // User exists — update password (handles first-time migration from local auth)
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

      // Update local DB reference
      await db.admin.update({
        where: { id: admin.id },
        data: { password: `supabase:${userId}`, lastLogin: new Date() },
      })

      return NextResponse.json({
        id: admin.id, name: admin.name, email: admin.email,
        role: admin.role, lastLogin: new Date(), authProvider: 'supabase',
      })
    }

    // ── Local Fallback Path ──
    if (admin.password.startsWith('supabase:')) {
      return NextResponse.json({ error: 'This account uses Supabase authentication. Please configure Supabase.' }, { status: 401 })
    }

    if (admin.password !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    await db.admin.update({ where: { id: admin.id }, data: { lastLogin: new Date() } })

    return NextResponse.json({
      id: admin.id, name: admin.name, email: admin.email,
      role: admin.role, lastLogin: new Date(), authProvider: 'local',
    })
  } catch (error) {
    console.error('POST /api/admin/auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
