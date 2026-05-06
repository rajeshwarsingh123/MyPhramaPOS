import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { differenceInDays } from 'date-fns'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const notifications: any[] = []

    // 1. Expired batches
    const { data: expiredBatches } = await supabase
      .from('Batch')
      .select('*, medicine:Medicine(name)')
      .eq('tenantId', tenantId)
      .lt('expiryDate', now.toISOString())
      .gt('quantity', 0)
      .eq('isActive', true)
      .order('expiryDate', { ascending: true })
      .limit(10)

    for (const batch of (expiredBatches || [])) {
      const daysExpired = Math.abs(differenceInDays(now, new Date(batch.expiryDate)))
      notifications.push({
        id: `expired-${batch.id}`,
        type: 'expired',
        title: `${(batch.medicine as any).name} — Expired`,
        description: `Batch ${batch.batchNumber} expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago. ${batch.quantity} units remaining (₹${((batch.quantity || 0) * (batch.mrp || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}).`,
        severity: 'critical',
        timestamp: batch.expiryDate,
      })
    }

    // 2. Expiring within 30 days
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const { data: expiringBatches } = await supabase
      .from('Batch')
      .select('*, medicine:Medicine(name)')
      .eq('tenantId', tenantId)
      .gte('expiryDate', now.toISOString())
      .lte('expiryDate', thirtyDaysFromNow.toISOString())
      .gt('quantity', 0)
      .eq('isActive', true)
      .order('expiryDate', { ascending: true })
      .limit(10)

    for (const batch of (expiringBatches || [])) {
      const daysLeft = differenceInDays(new Date(batch.expiryDate), now)
      const severityLevel = daysLeft <= 7 ? 'critical' : 'warning'
      notifications.push({
        id: `expiring-${batch.id}`,
        type: 'expiring_soon',
        title: `${(batch.medicine as any).name} — Expiring Soon`,
        description: `Batch ${batch.batchNumber} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. ${batch.quantity} units at risk.`,
        severity: severityLevel,
        timestamp: batch.expiryDate,
      })
    }

    // 3. Low stock medicines
    const { data: lowStockMedicines } = await supabase
      .from('Medicine')
      .select('name, batches:Batch(quantity)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)

    const lowStockItems = (lowStockMedicines || [])
      .map((med: any) => ({
        name: med.name,
        totalStock: (med.batches || []).reduce((sum: number, b: any) => sum + (b.quantity || 0), 0),
      }))
      .filter((item) => item.totalStock < 10)
      .sort((a, b) => a.totalStock - b.totalStock)
      .slice(0, 10)

    for (const item of lowStockItems) {
      const severityLevel = item.totalStock === 0 ? 'critical' : item.totalStock < 5 ? 'warning' : 'info'
      notifications.push({
        id: `lowstock-${item.name}`,
        type: 'low_stock',
        title: `${item.name} — Low Stock`,
        description: item.totalStock === 0
          ? 'Out of stock. Reorder needed immediately.'
          : `Only ${item.totalStock} unit${item.totalStock !== 1 ? 's' : ''} remaining. Consider reordering.`,
        severity: severityLevel,
        timestamp: now.toISOString(),
      })
    }

    // Sort by severity
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    notifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({
      notifications: notifications.slice(0, 20),
      total: notifications.length,
      criticalCount: notifications.filter((n) => n.severity === 'critical').length,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ notifications: [], total: 0, criticalCount: 0 }, { status: 500 })
  }
}
