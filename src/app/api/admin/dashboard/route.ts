import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_request: NextRequest) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Total tenants
    const totalTenants = await db.tenant.count()

    // Active tenants
    const activeTenants = await db.tenant.count({
      where: { status: 'active' },
    })

    // Suspended tenants
    const suspendedTenants = await db.tenant.count({
      where: { status: 'suspended' },
    })

    // Total revenue from active subscriptions
    const subscriptions = await db.subscription.findMany({
      where: { status: 'active' },
    })
    const monthlyRevenue = subscriptions.reduce((sum, s) => sum + s.amount, 0)

    // New signups today
    const newSignupsToday = await db.tenant.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Total tickets
    const totalTickets = await db.tenant.count()
    const openTickets = await db.supportTicket.count({
      where: { status: 'open' },
    })

    // Recent system logs (last 10)
    const recentLogs = await db.systemLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: { id: true, businessName: true },
        },
      },
    })

    // Plan distribution
    const planDistribution = await db.tenant.groupBy({
      by: ['plan'],
      _count: { plan: true },
    })

    return NextResponse.json({
      totalTenants,
      activeTenants,
      suspendedTenants,
      monthlyRevenue,
      newSignupsToday,
      totalTickets,
      openTickets,
      recentLogs,
      planDistribution: planDistribution.map((p) => ({
        plan: p.plan,
        count: p._count.plan,
      })),
    })
  } catch (error) {
    console.error('GET /api/admin/dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 },
    )
  }
}
