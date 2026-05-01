import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const [tenant, admin] = await Promise.all([
      db.tenant.findUnique({ where: { email: normalizedEmail }, select: { id: true, name: true, email: true, status: true } }),
      db.admin.findUnique({ where: { email: normalizedEmail }, select: { id: true, name: true, email: true, role: true, isActive: true } }),
    ])

    if (!tenant && !admin) {
      return NextResponse.json({ error: 'No account found with this email address' }, { status: 404 })
    }

    const isSuspended = tenant?.status === 'suspended' || (admin && !admin.isActive)
    if (isSuspended) {
      return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
    }

    // ── Supabase: Send real password reset email ──
    if (isSupabaseConfigured) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/auth/callback`,
      })
      if (resetError) {
        console.error('Supabase resetPasswordForEmail error:', resetError)
        if (tenant && !tenant.passwordHash?.startsWith('supabase:')) {
          // Fall through to local flow
        } else {
          return NextResponse.json({ error: 'Failed to send reset email.' }, { status: 500 })
        }
      }
    }

    const emailParts = normalizedEmail.split('@')
    const maskedEmail = emailParts[0].slice(0, 2) + '***@' + emailParts[1]

    return NextResponse.json({
      found: true,
      maskedEmail,
      name: tenant?.name || admin?.name || '',
      tenantId: tenant?.id,
      isAdmin: !!admin,
      isTenant: !!tenant,
      resetMethod: isSupabaseConfigured ? 'email' : 'direct',
    })
  } catch (error) {
    console.error('POST /api/auth/forgot-password/verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
