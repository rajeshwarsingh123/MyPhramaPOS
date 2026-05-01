import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { db } from '@/lib/db'

// Verify a Supabase access token and return the associated tenant/admin info
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken } = body

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const tenant = await db.tenant.findUnique({ where: { email: user.email! } })
    if (tenant) {
      return NextResponse.json({
        type: 'tenant', id: tenant.id, name: tenant.name, email: tenant.email,
        businessName: tenant.businessName, phone: tenant.phone, plan: tenant.plan, status: tenant.status,
      })
    }

    const admin = await db.admin.findUnique({ where: { email: user.email! } })
    if (admin) {
      return NextResponse.json({ type: 'admin', id: admin.id, name: admin.name, email: admin.email, role: admin.role })
    }

    return NextResponse.json({
      type: 'unregistered', email: user.email,
      message: 'User exists in Supabase but not linked to a local account',
    })
  } catch (error) {
    console.error('POST /api/auth/session error:', error)
    return NextResponse.json({ error: 'Session verification failed' }, { status: 500 })
  }
}
