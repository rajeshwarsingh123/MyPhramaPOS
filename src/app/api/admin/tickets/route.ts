import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10)),
    )
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { description: { contains: search } },
        {
          tenant: {
            OR: [
              { name: { contains: search } },
              { businessName: { contains: search } },
              { email: { contains: search } },
            ],
          },
        },
      ]
    }

    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              businessName: true,
              email: true,
            },
          },
        },
      }),
      db.supportTicket.count({ where }),
    ])

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/tickets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 },
    )
  }
}
