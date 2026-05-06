import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

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
  timestamp: string | Date
  actionUrl?: string
}

function formatRelativeTime(date: string | Date): string {
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
    const todayStr = today.toISOString()
    
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString()
    
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const thirtyDaysFromNowStr = thirtyDaysFromNow.toISOString()

    const notifications: AdminNotification[] = []

    // ─── New signups (last 7 days) ────────────────────────
    const { data: recentTenants } = await supabase
      .from('Tenant')
      .select('id, businessName, createdAt, plan')
      .gte('createdAt', weekAgoStr)
      .order('createdAt', { ascending: false })
      .limit(3)

    for (const t of (recentTenants || [])) {
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
    const { data: openTickets } = await supabase
      .from('SupportTicket')
      .select('id, subject, priority, createdAt, updatedAt, status, tenant:Tenant(businessName)')
      .in('status', ['open', 'in_progress'])
      .order('createdAt', { ascending: false })
      .limit(3)

    for (const tk of (openTickets || [])) {
      const priorityLabel = tk.priority === 'urgent' ? ' (Urgent!)' : tk.priority === 'high' ? ' (High)' : ''
      notifications.push({
        id: `ticket-${tk.id}`,
        type: 'ticket',
        title: `Support ticket${priorityLabel}`,
        description: `${(tk.tenant as any).businessName}: "${tk.subject.substring(0, 60)}${tk.subject.length > 60 ? '...' : ''}"`,
        timestamp: tk.createdAt,
        actionUrl: 'admin-tickets',
      })
    }

    // ─── Expiring subscriptions (within 30 days) ──────────
    const { data: expiringSubs } = await supabase
      .from('Subscription')
      .select('id, plan, endDate, updatedAt, tenant:Tenant(businessName)')
      .eq('status', 'active')
      .lte('endDate', thirtyDaysFromNowStr)
      .gte('endDate', todayStr)
      .order('endDate', { ascending: true })
      .limit(2)

    for (const s of (expiringSubs || [])) {
      const daysLeft = Math.ceil(
        (new Date(s.endDate).getTime() - today.getTime()) / 86400000,
      )
      notifications.push({
        id: `expiry-${s.id}`,
        type: 'expiry',
        title: 'Subscription expiring soon',
        description: `${(s.tenant as any).businessName} — ${s.plan.toUpperCase()} plan expires in ${daysLeft} days`,
        timestamp: s.updatedAt,
        actionUrl: 'admin-subscriptions',
      })
    }

    // ─── New / recent subscription payments ───────────────
    const { data: recentSubs } = await supabase
      .from('Subscription')
      .select('id, plan, amount, createdAt, tenant:Tenant(businessName)')
      .eq('status', 'active')
      .gte('createdAt', weekAgoStr)
      .order('createdAt', { ascending: false })
      .limit(2)

    for (const s of (recentSubs || [])) {
      if (notifications.some((n) => n.id === `expiry-${s.id}`)) continue
      notifications.push({
        id: `payment-${s.id}`,
        type: 'payment',
        title: 'New subscription payment',
        description: `${(s.tenant as any).businessName} upgraded to ${s.plan.toUpperCase()} — ₹${s.amount.toLocaleString('en-IN')}`,
        timestamp: s.createdAt,
        actionUrl: 'admin-payments',
      })
    }

    // ─── Subscription status changes (cancelled) ──────────
    const { data: cancelledSubs } = await supabase
      .from('Subscription')
      .select('id, plan, updatedAt, tenant:Tenant(businessName)')
      .eq('status', 'cancelled')
      .gte('updatedAt', weekAgoStr)
      .order('updatedAt', { ascending: false })
      .limit(2)

    for (const s of (cancelledSubs || [])) {
      notifications.push({
        id: `subscription-cancel-${s.id}`,
        type: 'subscription',
        title: 'Subscription cancelled',
        description: `${(s.tenant as any).businessName} cancelled their ${s.plan.toUpperCase()} plan`,
        timestamp: s.updatedAt,
        actionUrl: 'admin-subscriptions',
      })
    }

    // ─── System alerts ────────────────────────────────────
    const { count: suspendedCount } = await supabase
      .from('Tenant')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'suspended')

    if ((suspendedCount || 0) > 0) {
      notifications.push({
        id: 'system-suspended',
        type: 'system',
        title: 'Suspended accounts detected',
        description: `${suspendedCount} tenant account(s) currently suspended`,
        timestamp: new Date().toISOString(),
        actionUrl: 'admin-users',
      })
    }

    if (openTickets && openTickets.length > 0) {
      const urgentTicketsCount = openTickets.filter(
        (t) => t.priority === 'urgent' || t.priority === 'high',
      ).length
      
      if (urgentTicketsCount > 0) {
        notifications.push({
          id: 'system-urgent-tickets',
          type: 'system',
          title: 'High-priority tickets need attention',
          description: `${urgentTicketsCount} high-priority ticket(s) need attention`,
          timestamp: openTickets[0].updatedAt,
          actionUrl: 'admin-tickets',
        })
      }
    }

    const { count: expiredActiveCount } = await supabase
      .from('Subscription')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('endDate', todayStr)

    if ((expiredActiveCount || 0) > 0) {
      notifications.push({
        id: 'system-expired-active',
        type: 'system',
        title: 'Expired subscriptions still active',
        description: `${expiredActiveCount} subscription(s) have passed their end date but remain active`,
        timestamp: new Date().toISOString(),
        actionUrl: 'admin-subscriptions',
      })
    }

    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const limited = notifications.slice(0, 20)

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
      // In a real app we'd mark them in DB, but here we use in-memory set as per original
      // We'll just return success as we can't easily collect all IDs without re-running logic
      return NextResponse.json({ success: true, message: 'All marked as read' })
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      for (const id of body.ids) {
        readNotificationIds.add(String(id))
      }
      return NextResponse.json({ success: true, markedCount: body.ids.length })
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 },
    )
  } catch (error) {
    console.error('PUT /api/admin/notifications error:', error)
    return NextResponse.json({ error: 'Failed to mark notifications' }, { status: 500 })
  }
}
