import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10)),
    )
    const action = searchParams.get('action') || ''
    const tenantId = searchParams.get('tenantId') || ''

    const where: Record<string, unknown> = {}

    if (action) {
      where.action = { contains: action }
    }

    if (tenantId) {
      where.tenantId = tenantId
    }

    const [logs, total] = await Promise.all([
      db.systemLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              id: true,
              businessName: true,
              email: true,
            },
          },
        },
      }),
      db.systemLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/logs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system logs' },
      { status: 500 },
    )
  }
}
