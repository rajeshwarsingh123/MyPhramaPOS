import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// In-memory read state (per process, resets on restart — acceptable for SaaS admin)
const readNotificationIds = new Set<string>()

export type NotificationType =
  | 'new_signup'
  | 'subscription'
  | 'ticket'
  | 'payment'
  | 'system'
  | 'expiry'

interface AdminNotification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: Date
  actionUrl?: string
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

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
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const notifications: AdminNotification[] = []

    // ─── New signups (last 7 days) ────────────────────────
    const recentTenants = await db.tenant.findMany({
      where: { createdAt: { gte: weekAgo } },
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { id: true, businessName: true, createdAt: true, plan: true },
    })

    for (const t of recentTenants) {
      notifications.push({
        id: `signup-${t.id}`,
        type: 'new_signup',
        title: 'New pharmacy signed up',
        description: `"${t.businessName}" registered on the ${t.plan} plan`,
        timestamp: t.createdAt,
        actionUrl: 'admin-users',
      })
    }

    // ─── Open support tickets ─────────────────────────────
    const openTickets = await db.supportTicket.findMany({
      where: { status: { in: ['open', 'in_progress'] } },
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: { tenant: { select: { businessName: true } } },
    })

    for (const tk of openTickets) {
      const priorityLabel = tk.priority === 'urgent' ? ' (Urgent!)' : tk.priority === 'high' ? ' (High)' : ''
      notifications.push({
        id: `ticket-${tk.id}`,
        type: 'ticket',
        title: `Support ticket${priorityLabel}`,
        description: `${tk.tenant.businessName}: "${tk.subject.substring(0, 60)}${tk.subject.length > 60 ? '...' : ''}"`,
        timestamp: tk.createdAt,
        actionUrl: 'admin-tickets',
      })
    }

    // ─── Expiring subscriptions (within 30 days) ──────────
    const expiringSubs = await db.subscription.findMany({
      where: {
        status: 'active',
        endDate: { lte: thirtyDaysFromNow, gte: today },
      },
      take: 2,
      orderBy: { endDate: 'asc' },
      include: { tenant: { select: { businessName: true } } },
    })

    for (const s of expiringSubs) {
      const daysLeft = Math.ceil(
        (new Date(s.endDate).getTime() - today.getTime()) / 86400000,
      )
      notifications.push({
        id: `expiry-${s.id}`,
        type: 'expiry',
        title: 'Subscription expiring soon',
        description: `${s.tenant.businessName} — ${s.plan.toUpperCase()} plan expires in ${daysLeft} days`,
        timestamp: s.updatedAt,
        actionUrl: 'admin-subscriptions',
      })
    }

    // ─── New / recent subscription payments ───────────────
    const recentSubs = await db.subscription.findMany({
      where: {
        status: 'active',
        createdAt: { gte: weekAgo },
      },
      take: 2,
      orderBy: { createdAt: 'desc' },
      include: { tenant: { select: { businessName: true } } },
    })

    for (const s of recentSubs) {
      // Avoid duplicate with expiring
      if (notifications.some((n) => n.id === `expiry-${s.id}`)) continue
      notifications.push({
        id: `payment-${s.id}`,
        type: 'payment',
        title: 'New subscription payment',
        description: `${s.tenant.businessName} upgraded to ${s.plan.toUpperCase()} — ₹${s.amount.toLocaleString('en-IN')}`,
        timestamp: s.createdAt,
        actionUrl: 'admin-payments',
      })
    }

    // ─── Subscription status changes (cancelled) ──────────
    const cancelledSubs = await db.subscription.findMany({
      where: {
        status: 'cancelled',
        updatedAt: { gte: weekAgo },
      },
      take: 2,
      orderBy: { updatedAt: 'desc' },
      include: { tenant: { select: { businessName: true } } },
    })

    for (const s of cancelledSubs) {
      notifications.push({
        id: `subscription-cancel-${s.id}`,
        type: 'subscription',
        title: 'Subscription cancelled',
        description: `${s.tenant.businessName} cancelled their ${s.plan.toUpperCase()} plan`,
        timestamp: s.updatedAt,
        actionUrl: 'admin-subscriptions',
      })
    }

    // ─── System alerts ────────────────────────────────────
    // Check for suspended tenants (potential issues)
    const suspendedCount = await db.tenant.count({
      where: { status: 'suspended' },
    })

    if (suspendedCount > 0) {
      notifications.push({
        id: 'system-suspended',
        type: 'system',
        title: 'Suspended accounts detected',
        description: `${suspendedCount} tenant account(s) currently suspended`,
        timestamp: new Date(),
        actionUrl: 'admin-users',
      })
    }

    // High-priority open tickets
    const urgentTickets = openTickets.filter(
      (t) => t.priority === 'urgent' || t.priority === 'high',
    )
    if (urgentTickets.length > 0) {
      notifications.push({
        id: 'system-urgent-tickets',
        type: 'system',
        title: 'High-priority tickets need attention',
        description: `${urgentTickets.length} high-priority ticket(s) are still ${urgentTickets[0].status}`,
        timestamp: urgentTickets[0].updatedAt,
        actionUrl: 'admin-tickets',
      })
    }

    // Expired subscriptions (already past end date but still marked active — data integrity)
    const expiredActive = await db.subscription.count({
      where: {
        status: 'active',
        endDate: { lt: today },
      },
    })

    if (expiredActive > 0) {
      notifications.push({
        id: 'system-expired-active',
        type: 'system',
        title: 'Expired subscriptions still active',
        description: `${expiredActive} subscription(s) have passed their end date but remain active`,
        timestamp: new Date(),
        actionUrl: 'admin-subscriptions',
      })
    }

    // ─── Sort by timestamp (most recent first) and limit ──
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const limited = notifications.slice(0, 20)

    // Format for frontend
    const formatted = limited.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      description: n.description,
      time: formatRelativeTime(n.timestamp),
      isRead: readNotificationIds.has(n.id),
      actionUrl: n.actionUrl ?? null,
    }))

    const unreadCount = formatted.filter((n) => !n.isRead).length

    return NextResponse.json({
      notifications: formatted,
      unreadCount,
      totalCount: notifications.length,
    })
  } catch (error) {
    console.error('GET /api/admin/notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.markAll === true) {
      // Mark all current notifications as read by storing a marker
      // We need to fetch current IDs and mark them all
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const thirtyDaysFromNow = new Date(today)
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      // Collect all possible notification IDs
      const recentTenants = await db.tenant.findMany({
        where: { createdAt: { gte: weekAgo } },
        take: 3,
        select: { id: true },
      })
      const openTickets = await db.supportTicket.findMany({
        where: { status: { in: ['open', 'in_progress'] } },
        take: 3,
        select: { id: true },
      })
      const expiringSubs = await db.subscription.findMany({
        where: { status: 'active', endDate: { lte: thirtyDaysFromNow, gte: today } },
        take: 2,
        select: { id: true },
      })
      const recentSubs = await db.subscription.findMany({
        where: { status: 'active', createdAt: { gte: weekAgo } },
        take: 2,
        select: { id: true },
      })
      const cancelledSubs = await db.subscription.findMany({
        where: { status: 'cancelled', updatedAt: { gte: weekAgo } },
        take: 2,
        select: { id: true },
      })

      const allIds = [
        ...recentTenants.map((t) => `signup-${t.id}`),
        ...openTickets.map((t) => `ticket-${t.id}`),
        ...expiringSubs.map((s) => `expiry-${s.id}`),
        ...recentSubs.map((s) => `payment-${s.id}`),
        ...cancelledSubs.map((s) => `subscription-cancel-${s.id}`),
        'system-suspended',
        'system-urgent-tickets',
        'system-expired-active',
      ]

      for (const id of allIds) {
        readNotificationIds.add(id)
      }

      return NextResponse.json({ success: true, markedCount: allIds.length })
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      for (const id of body.ids) {
        readNotificationIds.add(String(id))
      }
      return NextResponse.json({ success: true, markedCount: body.ids.length })
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide { ids: string[] } or { markAll: true }' },
      { status: 400 },
    )
  } catch (error) {
    console.error('PUT /api/admin/notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications' },
      { status: 500 },
    )
  }
}
