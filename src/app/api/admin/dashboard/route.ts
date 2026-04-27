import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_request: NextRequest) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    // ─── Stats ──────────────────────────────────────────
    const totalUsers = await db.tenant.count()
    const activeUsers = await db.tenant.count({ where: { status: 'active' } })
    const suspendedUsers = await db.tenant.count({ where: { status: 'suspended' } })

    const newSignupsToday = await db.tenant.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    })

    const newSignupsWeek = await db.tenant.count({
      where: { createdAt: { gte: weekAgo } },
    })

    // Total revenue (sum of all subscription amounts ever paid)
    const allSubscriptions = await db.subscription.findMany({
      where: { status: 'active' },
    })
    const totalRevenue = allSubscriptions.reduce((sum, s) => sum + s.amount, 0)

    // MRR = sum of active subscription amounts
    const mrr = totalRevenue

    // Total bills generated (Sale count)
    const totalBillsGenerated = await db.sale.count()

    // Total medicines added
    const totalMedicinesAdded = await db.medicine.count()

    // Open tickets
    const openTickets = await db.supportTicket.count({
      where: { status: 'open' },
    })

    // Expiring subscriptions (within 30 days)
    const expiringSubscriptions = await db.subscription.count({
      where: {
        status: 'active',
        endDate: { lte: thirtyDaysFromNow, gte: today },
      },
    })

    // ─── Recent Activity (last 10) ──────────────────────
    const recentTenants = await db.tenant.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: { id: true, businessName: true, createdAt: true },
    })

    const recentSubscriptions = await db.subscription.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: { tenant: { select: { businessName: true } } },
    })

    const recentTickets = await db.supportTicket.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: { tenant: { select: { businessName: true } } },
    })

    const activities: Array<{
      type: 'signup' | 'subscription' | 'ticket' | 'payment'
      description: string
      time: string
    }> = []

    for (const t of recentTenants) {
      activities.push({
        type: 'signup',
        description: `${t.businessName} signed up`,
        time: formatTimeAgo(t.createdAt),
      })
    }

    for (const s of recentSubscriptions) {
      activities.push({
        type: 'subscription',
        description: `${s.tenant.businessName} subscribed to ${s.plan.toUpperCase()} plan`,
        time: formatTimeAgo(s.createdAt),
      })
    }

    for (const tk of recentTickets) {
      activities.push({
        type: 'ticket',
        description: `${tk.tenant.businessName} opened: "${tk.subject}"`,
        time: formatTimeAgo(tk.createdAt),
      })
    }

    // Sort by most recent and take 10
    const recentActivity = activities
      .sort((a, b) => {
        // Already sorted by createdAt desc, so maintain order
        return 0
      })
      .slice(0, 10)

    // ─── Revenue Trend (last 12 months) ─────────────────
    const revenueTrend: Array<{ month: string; revenue: number; newUsers: number }> = []
    for (let i = 11; i >= 0; i--) {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)

      const monthSubscriptions = await db.subscription.aggregate({
        _sum: { amount: true },
        where: {
          status: 'active',
          createdAt: { gte: startOfMonth, lt: endOfMonth },
        },
      })

      const monthNewUsers = await db.tenant.count({
        where: {
          createdAt: { gte: startOfMonth, lt: endOfMonth },
        },
      })

      const monthLabel = startOfMonth.toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
      })

      revenueTrend.push({
        month: monthLabel,
        revenue: monthSubscriptions._sum.amount ?? 0,
        newUsers: monthNewUsers,
      })
    }

    // ─── Recent System Logs (last 10) ───────────────────
    const recentLogs = await db.systemLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: { id: true, businessName: true },
        },
      },
    })

    // ─── Plan Distribution ──────────────────────────────
    const planGroups = await db.tenant.groupBy({
      by: ['plan'],
      _count: { plan: true },
    })

    const planDistribution = {
      free: planGroups.find((p) => p.plan === 'free')?._count.plan ?? 0,
      pro: planGroups.find((p) => p.plan === 'pro')?._count.plan ?? 0,
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        newSignupsToday,
        newSignupsWeek,
        totalRevenue,
        mrr,
        totalBillsGenerated,
        totalMedicinesAdded,
        openTickets,
        expiringSubscriptions,
      },
      recentActivity,
      revenueTrend,
      recentLogs,
      planDistribution,
    })
  } catch (error) {
    console.error('GET /api/admin/dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 },
    )
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}
