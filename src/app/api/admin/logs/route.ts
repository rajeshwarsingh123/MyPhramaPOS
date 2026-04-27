import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const action = searchParams.get('action') || ''
    const tenantId = searchParams.get('tenantId') || ''
    const level = searchParams.get('level') || ''
    const fromDate = searchParams.get('fromDate') || ''
    const toDate = searchParams.get('toDate') || ''

    const where: Prisma.SystemLogWhereInput = {}

    if (action && action !== 'all') {
      // Map action types to search patterns
      if (action === 'login') {
        where.action = { contains: 'login' }
      } else if (action === 'error') {
        where.OR = [
          { action: { contains: 'error' } },
          { details: { contains: 'error' } },
        ]
      } else if (action === 'warning') {
        where.OR = [
          { action: { contains: 'warning' } },
          { details: { contains: 'warning' } },
        ]
      } else if (action === 'update') {
        where.action = { contains: 'update' }
      } else if (action === 'create') {
        where.action = { contains: 'create' }
      } else {
        where.action = { contains: action }
      }
    }

    if (tenantId) {
      where.tenantId = tenantId
    }

    if (fromDate) {
      where.createdAt = { ...((where.createdAt as Prisma.DateTimeNullableFilter) || {}), gte: new Date(fromDate) }
    }

    if (toDate) {
      where.createdAt = { ...((where.createdAt as Prisma.DateTimeNullableFilter) || {}), lte: new Date(toDate + 'T23:59:59') }
    }

    const [logs, total, summary] = await Promise.all([
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
              name: true,
              email: true,
            },
          },
        },
      }),
      db.systemLog.count({ where }),
      // Summary counts
      Promise.all([
        db.systemLog.count(),
        db.systemLog.count({
          where: { OR: [{ action: { contains: 'error' } }, { details: { contains: 'error' } }] },
        }),
        db.systemLog.count({
          where: { OR: [{ action: { contains: 'warning' } }, { details: { contains: 'warning' } }] },
        }),
        db.systemLog.count({
          where: { action: { contains: 'login' } },
        }),
      ]),
    ])

    // Determine level for each log based on action/details content
    const enrichedLogs = logs.map((log) => {
      const actionLower = log.action.toLowerCase()
      const detailsLower = (log.details || '').toLowerCase()
      let logLevel = 'info' // default
      if (actionLower.includes('error') || detailsLower.includes('error')) {
        logLevel = 'error'
      } else if (actionLower.includes('warning') || detailsLower.includes('warning')) {
        logLevel = 'warning'
      } else if (actionLower.includes('login') || actionLower.includes('signup') || actionLower.includes('register')) {
        logLevel = 'login'
      } else if (actionLower.includes('create') || actionLower.includes('add')) {
        logLevel = 'create'
      } else if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('change')) {
        logLevel = 'update'
      }

      // Apply level filter client-side if needed
      return {
        id: log.id,
        tenantId: log.tenantId,
        action: log.action,
        details: log.details,
        createdAt: log.createdAt,
        tenant: log.tenant,
        level: logLevel,
      }
    })

    // Apply level filter
    let filteredLogs = enrichedLogs
    if (level && level !== 'all') {
      filteredLogs = enrichedLogs.filter((log) => log.level === level)
    }

    const [totalLogs, errorCount, warningCount, loginCount] = summary

    return NextResponse.json({
      logs: filteredLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total: totalLogs,
        errors: errorCount,
        warnings: warningCount,
        logins: loginCount,
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
