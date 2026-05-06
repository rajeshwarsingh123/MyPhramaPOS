import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getAdminId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const adminId = await getAdminId(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10)),
    )
    const plan = searchParams.get('plan') || ''
    const status = searchParams.get('status') || ''

    let query = supabase
      .from('Tenant')
      .select(`
        *,
        subscriptions:Subscription(id, plan, amount, status, startDate, endDate)
      `, { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,businessName.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    if (plan) {
      query = query.eq('plan', plan)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: tenants, count: total, error } = await query
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    // Fetch counts separately as Supabase doesn't support complex _count in select easily
    const tenantsWithCounts = await Promise.all((tenants || []).map(async (tenant) => {
      const [{ count: ticketsCount }, { count: logsCount }] = await Promise.all([
        supabase.from('SupportTicket').select('*', { count: 'exact', head: true }).eq('tenantId', tenant.id),
        supabase.from('SystemLog').select('*', { count: 'exact', head: true }).eq('tenantId', tenant.id),
      ])

      return {
        ...tenant,
        // Match the Prisma 'include' structure
        subscriptions: tenant.subscriptions || [],
        _count: {
          supportTickets: ticketsCount || 0,
          systemLogs: logsCount || 0,
        }
      }
    }))

    return NextResponse.json({
      tenants: tenantsWithCounts,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/tenants error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = await getAdminId(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const {
      name,
      email,
      phone,
      businessName,
      businessPhone,
      businessAddress,
      gstNumber,
      plan,
      password,
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 },
      )
    }

    if (!businessName || !businessName.trim()) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 },
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 },
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check for duplicate email
    const { data: existing } = await supabase
      .from('Tenant')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'A tenant with this email already exists' },
        { status: 409 },
      )
    }

    const { data: tenant, error: createError } = await supabase
      .from('Tenant')
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        businessName: businessName.trim(),
        businessPhone: businessPhone?.trim() || null,
        businessAddress: businessAddress?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
        plan: plan || 'free',
        status: 'active',
        passwordHash: password, // Note: In a real app, this should be hashed if not using Supabase Auth
      })
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/tenants error:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 },
    )
  }
}
