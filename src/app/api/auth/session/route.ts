import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

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

    // Try to find tenant in Supabase 'Tenant' table
    const { data: tenant } = await supabase
      .from('Tenant')
      .select('*')
      .eq('email', user.email!)
      .single()
      
    if (tenant) {
      return NextResponse.json({
        type: 'tenant', id: tenant.id, name: tenant.name, email: tenant.email,
        businessName: tenant.businessName, phone: tenant.phone, plan: tenant.plan, status: tenant.status,
      })
    }

    // Try to find admin in Supabase 'Admin' table
    const { data: admin } = await supabase
      .from('Admin')
      .select('*')
      .eq('email', user.email!)
      .single()
      
    if (admin) {
      return NextResponse.json({ type: 'admin', id: admin.id, name: admin.name, email: admin.email, role: admin.role })
    }

    return NextResponse.json({
      type: 'unregistered', email: user.email,
      message: 'User exists in Supabase but not linked to a database account',
    })
  } catch (error) {
    console.error('POST /api/auth/session error:', error)
    return NextResponse.json({ error: 'Session verification failed' }, { status: 500 })
  }
}
