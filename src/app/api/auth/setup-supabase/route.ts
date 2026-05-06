import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured, adminSupabase, hasServiceRoleKey } from '@/lib/supabase/server'

// One-time setup: Create super admin user in Supabase Auth
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if admin exists in Supabase 'Admin' table
    const { data: admin, error: adminDbError } = await supabase
      .from('Admin')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (adminDbError || !admin) {
      return NextResponse.json(
        { error: 'Admin not found in database' },
        { status: 404 },
      )
    }

    // Strategy 1: Admin API (service role key) — auto-confirmed, no email needed
    if (hasServiceRoleKey && adminSupabase) {
      const { data: existingUsers, error: listError } = await adminSupabase.auth.admin.listUsers({
        filters: { email: normalizedEmail },
      })

      if (!listError && existingUsers?.users?.length > 0) {
        const userId = existingUsers.users[0].id
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true,
          user_metadata: { name: admin.name, role: admin.role },
        })

        if (updateError) {
          console.error('Failed to update existing Supabase user:', updateError)
          return NextResponse.json({ error: `Failed to update: ${updateError.message}` }, { status: 500 })
        }

        await supabase
          .from('Admin')
          .update({ password: `supabase:${userId}` })
          .eq('id', admin.id)

        return NextResponse.json({ success: true, message: 'Admin updated in Supabase', userId, method: 'admin_update' })
      }

      // User doesn't exist — create with admin API
      const { data: newUserData, error: createError } = await adminSupabase.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: { name: admin.name, role: admin.role },
      })

      if (!createError && newUserData.user) {
        await supabase
          .from('Admin')
          .update({ password: `supabase:${newUserData.user.id}` })
          .eq('id', admin.id)

        return NextResponse.json({ success: true, message: 'Admin created in Supabase (auto-confirmed)', userId: newUserData.user.id, method: 'admin_create' })
      }

      console.error('Admin API create failed:', createError)
    }

    // Strategy 2: signUp (may require email confirmation)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password,
      options: { data: { name: admin.name, role: admin.role } },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        return NextResponse.json({ error: 'User already exists in Supabase but password mismatch. Check Supabase dashboard.' }, { status: 409 })
      }
      return NextResponse.json({ error: `Failed: ${signUpError.message}` }, { status: 500 })
    }

    if (!signUpData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    await supabase
      .from('Admin')
      .update({ password: `supabase:${signUpData.user.id}` })
      .eq('id', admin.id)

    return NextResponse.json({
      success: true,
      message: signUpData.user.aud === 'authenticated' ? 'Admin created' : 'Admin created — check email to confirm',
      userId: signUpData.user.id,
      method: 'signup',
    })
  } catch (error) {
    console.error('POST /api/auth/setup-supabase error:', error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}

// GET: Check Supabase connection status
export async function GET() {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({
        configured: false,
        hasServiceRoleKey: false,
        message: 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env',
      })
    }

    const { error } = await supabase.auth.getSession()

    return NextResponse.json({
      configured: true,
      connected: !error,
      hasServiceRoleKey,
      projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https:\/\//, '').split('.')[0],
      message: !error ? 'Supabase is connected and ready' : 'Connection issue detected',
    })
  } catch (error) {
    return NextResponse.json({ configured: isSupabaseConfigured, connected: false, hasServiceRoleKey, error: String(error) })
  }
}
