import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, adminSupabase, anonSupabase, hasServiceRoleKey } from '@/lib/supabase/server'
import { db } from '@/lib/db'

function generateOTP(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0] % 1000000).toString().padStart(6, '0')
}

const DISPOSABLE_DOMAINS = [
  'temp-mail.org', 'tempmail.net', 'guerrillamail.com', '10minutemail.com',
  'mailinator.com', 'dispostable.com', 'throwawaymail.com', 'getnada.com',
  'yopmail.com', 'temp-mail.io', 'minuteinbox.com', 'proxymit.com'
]

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return DISPOSABLE_DOMAINS.includes(domain)
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
    let supabaseUserId: string | null = null

    // ── Supabase Auth Path ──
    if (isSupabaseConfigured && adminSupabase && hasServiceRoleKey) {
      // 1. Check if user already exists in Supabase
      const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers({
        filters: { email: normalizedEmail },
      })
      
      if (!listError && usersData?.users?.length > 0) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      }

      // 2. Create new user using admin API
      // Note: Database records (Tenant, Subscription, etc.) are created automatically 
      // by the 'on_auth_user_created' SQL trigger we added to Supabase.
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
          role: 'tenant',
        },
      })

      if (createError) {
        console.error('Supabase admin create error:', createError)
        return NextResponse.json({ error: createError.message }, { status: 400 })
      }

      if (newUser.user) {
        supabaseUserId = newUser.user.id
      }
    } else {
      return NextResponse.json({ error: 'Supabase is not configured. Please set up your credentials.' }, { status: 500 })
    }

    // ── Registration Success ──
    return NextResponse.json({
      success: true,
      message: 'Account created successfully! You can now sign in.',
      name: name.trim(),
      email: normalizedEmail,
    })


    return NextResponse.json({
      success: true,
      message: 'Account created successfully! You can now sign in.',
      name: name.trim(),
      email: normalizedEmail,
    })
  } catch (error) {
    console.error('POST /api/auth/register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
