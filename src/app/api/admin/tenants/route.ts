import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10)),
    )
    const plan = searchParams.get('plan') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { businessName: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    if (plan) {
      where.plan = plan
    }

    if (status) {
      where.status = status
    }

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: {
            where: { status: 'active' },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              supportTickets: true,
              systemLogs: true,
            },
          },
        },
      }),
      db.tenant.count({ where }),
    ])

    return NextResponse.json({
      tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    // Check for duplicate email
    const existing = await db.tenant.findUnique({
      where: { email: email.trim().toLowerCase() },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A tenant with this email already exists' },
        { status: 409 },
      )
    }

    const tenant = await db.tenant.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        businessName: businessName.trim(),
        businessPhone: businessPhone?.trim() || null,
        businessAddress: businessAddress?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
        plan: plan || 'free',
        status: 'active',
        passwordHash: password,
      },
    })

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/tenants error:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 },
    )
  }
}
