import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

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
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: suspendedUsers },
      { count: newSignupsToday },
      { count: newSignupsWeek },
      { data: allSubscriptions },
      { count: totalBillsGenerated },
      { count: totalMedicinesAdded },
      { count: openTickets },
      { count: expiringSubscriptions }
    ] = await Promise.all([
      supabase.from('Tenant').select('*', { count: 'exact', head: true }),
      supabase.from('Tenant').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('Tenant').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
      supabase.from('Tenant').select('*', { count: 'exact', head: true }).gte('createdAt', today.toISOString()).lt('createdAt', tomorrow.toISOString()),
      supabase.from('Tenant').select('*', { count: 'exact', head: true }).gte('createdAt', weekAgo.toISOString()),
      supabase.from('Subscription').select('amount').eq('status', 'active'),
      supabase.from('Sale').select('*', { count: 'exact', head: true }),
      supabase.from('Medicine').select('*', { count: 'exact', head: true }),
      supabase.from('SupportTicket').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('Subscription').select('*', { count: 'exact', head: true }).eq('status', 'active').lte('endDate', thirtyDaysFromNow.toISOString()).gte('endDate', today.toISOString())
    ])

    const totalRevenue = (allSubscriptions || []).reduce((sum, s) => sum + (s.amount || 0), 0)
    const mrr = totalRevenue

    // ─── Recent Activity (last 10) ──────────────────────
    const [
      { data: recentTenants },
      { data: recentSubscriptions },
      { data: recentTickets }
    ] = await Promise.all([
      supabase.from('Tenant').select('id, businessName, createdAt').order('createdAt', { ascending: false }).limit(4),
      supabase.from('Subscription').select('*, tenant:Tenant(businessName)').order('createdAt', { ascending: false }).limit(3),
      supabase.from('SupportTicket').select('*, tenant:Tenant(businessName)').order('createdAt', { ascending: false }).limit(3)
    ])

    const activities: any[] = []

    for (const t of (recentTenants || [])) {
      activities.push({
        type: 'signup',
        description: `${t.businessName} signed up`,
        time: formatTimeAgo(t.createdAt),
      })
    }

    for (const s of (recentSubscriptions || [])) {
      activities.push({
        type: 'subscription',
        description: `${(s.tenant as any).businessName} subscribed to ${s.plan?.toUpperCase()} plan`,
        time: formatTimeAgo(s.createdAt),
      })
    }

    for (const tk of (recentTickets || [])) {
      activities.push({
        type: 'ticket',
        description: `${(tk.tenant as any).businessName} opened: "${tk.subject}"`,
        time: formatTimeAgo(tk.createdAt),
      })
    }

    const recentActivity = activities.slice(0, 10)

    // ─── Revenue Trend (last 12 months) ─────────────────
    const revenueTrend: any[] = []
    for (let i = 11; i >= 0; i--) {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)

      const monthLabel = startOfMonth.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      
      // Note: This is 12 parallel requests if we are not careful. 
      // For now, it's okay, but better to fetch all and group in JS.
      revenueTrend.push({ month: monthLabel, revenue: 0, newUsers: 0 })
    }

    // ─── Recent System Logs (last 10) ───────────────────
    const { data: recentLogs } = await supabase
      .from('SystemLog')
      .select('*, tenant:Tenant(id, businessName)')
      .order('createdAt', { ascending: false })
      .limit(10)

    // ─── Plan Distribution ──────────────────────────────
    const { data: tenantsForPlans } = await supabase.from('Tenant').select('plan')
    const planDistribution = {
      free: (tenantsForPlans || []).filter(t => t.plan === 'free').length,
      pro: (tenantsForPlans || []).filter(t => t.plan === 'pro').length,
    }

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        suspendedUsers: suspendedUsers || 0,
        newSignupsToday: newSignupsToday || 0,
        newSignupsWeek: newSignupsWeek || 0,
        totalRevenue,
        mrr,
        totalBillsGenerated: totalBillsGenerated || 0,
        totalMedicinesAdded: totalMedicinesAdded || 0,
        openTickets: openTickets || 0,
        expiringSubscriptions: expiringSubscriptions || 0,
      },
      recentActivity,
      revenueTrend, // Simplified for now
      recentLogs: recentLogs || [],
      planDistribution,
    })
  } catch (error) {
    console.error('GET /api/admin/dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}

function formatTimeAgo(date: any): string {
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
