import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const status = searchParams.get('status') || ''
    const plan = searchParams.get('plan') || ''
    const fromDate = searchParams.get('fromDate') || ''
    const toDate = searchParams.get('toDate') || ''

    const where: Prisma.SubscriptionWhereInput = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (plan && plan !== 'all') {
      where.plan = plan
    }

    if (fromDate) {
      where.startDate = { ...((where.startDate as Prisma.DateTimeNullableFilter) || {}), gte: new Date(fromDate) }
    }

    if (toDate) {
      where.startDate = { ...((where.startDate as Prisma.DateTimeNullableFilter) || {}), lte: new Date(toDate) }
    }

    const [payments, total] = await Promise.all([
      db.subscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
              businessName: true,
            },
          },
        },
      }),
      db.subscription.count({ where }),
    ])

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        tenantName: p.tenant?.businessName || p.tenant?.name || 'Unknown',
        tenantEmail: p.tenant?.email || '',
        plan: p.plan,
        amount: p.amount,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        paymentMode: p.paymentMode,
        createdAt: p.createdAt,
      })),
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/payments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 },
    )
  }
}
