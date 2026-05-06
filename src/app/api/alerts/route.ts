import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // 1. Expiring soon
    const { data: expiringBatches } = await supabase
      .from('Batch')
      .select('*, medicine:Medicine(id, name, unitType)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .gt('quantity', 0)
      .gte('expiryDate', now.toISOString())
      .lte('expiryDate', thirtyDaysFromNow.toISOString())
      .order('expiryDate', { ascending: true })
      .limit(20)

    // 2. Expired
    const { data: expiredBatches } = await supabase
      .from('Batch')
      .select('*, medicine:Medicine(id, name, unitType)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .gt('quantity', 0)
      .lt('expiryDate', now.toISOString())
      .order('expiryDate', { ascending: false })
      .limit(20)

    // 3. Low stock
    const { data: medicinesWithStock } = await supabase
      .from('Medicine')
      .select('id, name, unitType, batches:Batch(quantity, isActive)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)

    const lowStockMedicines = (medicinesWithStock || [])
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        unitType: m.unitType,
        totalStock: (m.batches || []).filter((b: any) => b.isActive).reduce((sum: number, b: any) => sum + (b.quantity || 0), 0),
      }))
      .filter((m) => m.totalStock < 10)
      .sort((a, b) => a.totalStock - b.totalStock)

    const alerts: any[] = []

    // Expired alerts
    for (const batch of (expiredBatches || [])) {
      const daysAgo = Math.floor((now.getTime() - new Date(batch.expiryDate).getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({
        id: batch.id,
        type: 'expired',
        title: `${(batch.medicine as any).name} has expired`,
        description: `Batch ${batch.batchNumber} expired ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago. ${batch.quantity} units remaining.`,
        severity: 'critical',
        meta: {
          medicineId: batch.medicineId,
          medicineName: (batch.medicine as any).name,
          batchNumber: batch.batchNumber,
          quantity: batch.quantity,
          expiryDate: batch.expiryDate,
          unitType: (batch.medicine as any).unitType,
        },
      })
    }

    // Expiring soon alerts
    for (const batch of (expiringBatches || [])) {
      const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({
        id: batch.id,
        type: 'expiring',
        title: `${(batch.medicine as any).name} expiring soon`,
        description: `Batch ${batch.batchNumber} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. ${batch.quantity} units remaining.`,
        severity: daysLeft <= 7 ? 'warning' : 'info',
        meta: {
          medicineId: batch.medicineId,
          medicineName: (batch.medicine as any).name,
          batchNumber: batch.batchNumber,
          quantity: batch.quantity,
          expiryDate: batch.expiryDate,
          unitType: (batch.medicine as any).unitType,
          daysLeft,
        },
      })
    }

    // Low stock alerts
    for (const med of lowStockMedicines) {
      alerts.push({
        id: `low-stock-${med.id}`,
        type: 'low_stock',
        title: `${med.name} - Low Stock`,
        description: `Only ${med.totalStock} ${med.unitType}${med.totalStock !== 1 ? 's' : ''} remaining in stock.`,
        severity: med.totalStock === 0 ? 'critical' : 'warning',
        meta: {
          medicineId: med.id,
          medicineName: med.name,
          totalStock: med.totalStock,
          unitType: med.unitType,
        },
      })
    }

    // Sort by severity
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({
      alerts,
      summary: {
        expiredCount: (expiredBatches || []).length,
        expiringSoonCount: (expiringBatches || []).length,
        lowStockCount: lowStockMedicines.length,
      },
    })
  } catch (error) {
    console.error('Alerts error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}
