import { supabase } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { differenceInDays } from 'date-fns'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch recent sales (last 10)
    const { data: recentSales } = await supabase
      .from('Sale')
      .select('*, customer:Customer(name)')
      .eq('tenantId', tenantId)
      .gte('saleDate', thirtyDaysAgo)
      .not('notes', 'ilike', 'RETURN%')
      .order('saleDate', { ascending: false })
      .limit(10)

    // Fetch recent purchases (last 5)
    const { data: recentPurchases } = await supabase
      .from('PurchaseOrder')
      .select('*, supplier:Supplier(name)')
      .eq('tenantId', tenantId)
      .gte('invoiceDate', thirtyDaysAgo)
      .order('invoiceDate', { ascending: false })
      .limit(5)

    // Fetch recent returns
    const { data: recentReturns } = await supabase
      .from('Sale')
      .select('*, customer:Customer(name)')
      .eq('tenantId', tenantId)
      .gte('saleDate', thirtyDaysAgo)
      .like('notes', 'RETURN%')
      .order('saleDate', { ascending: false })
      .limit(5)

    // Fetch low stock alerts
    const { data: medicines } = await supabase
      .from('Medicine')
      .select('id, name, batches:Batch(quantity, expiryDate)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)

    const lowStockAlerts = (medicines || [])
      .map((med: any) => ({
        id: med.id,
        name: med.name,
        totalStock: (med.batches || []).reduce((sum: number, b: any) => sum + (b.quantity || 0), 0),
      }))
      .filter((m) => m.totalStock > 0 && m.totalStock < 10)
      .sort((a, b) => a.totalStock - b.totalStock)
      .slice(0, 5)

    // Fetch expiry alerts
    const expiryAlerts = (medicines || [])
      .flatMap((med: any) => {
        const activeBatches = (med.batches || []).filter((b: any) => (b.quantity || 0) > 0)
        return activeBatches.map((batch: any) => ({
          medicineName: med.name,
          daysLeft: differenceInDays(new Date(batch.expiryDate), now),
          quantity: batch.quantity,
        }))
      })
      .filter((a) => a.daysLeft <= 90)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5)

    // Build activity feed
    const activities: any[] = []

    // Add sales
    for (const sale of (recentSales || [])) {
      activities.push({
        id: sale.id,
        type: 'sale',
        title: 'New Sale',
        description: `${(sale.customer as any)?.name || 'Walk-in'} — ${sale.invoiceNo}`,
        timestamp: sale.saleDate,
        amount: sale.totalAmount,
      })
    }

    // Add purchases
    for (const po of (recentPurchases || [])) {
      activities.push({
        id: po.id,
        type: 'purchase',
        title: 'New Purchase',
        description: `From ${(po.supplier as any)?.name || 'Unknown'} — ${po.invoiceNo || 'No Invoice'}`,
        timestamp: po.invoiceDate,
        amount: po.totalAmount,
      })
    }

    // Add returns
    for (const ret of (recentReturns || [])) {
      activities.push({
        id: ret.id,
        type: 'return',
        title: 'Sale Returned',
        description: `${(ret.customer as any)?.name || 'Walk-in'} — ${ret.invoiceNo}`,
        timestamp: ret.saleDate,
        amount: ret.totalAmount,
      })
    }

    // Add low stock alerts
    for (const stock of lowStockAlerts) {
      activities.push({
        id: `low-${stock.id}`,
        type: 'low_stock',
        title: 'Low Stock Alert',
        description: `${stock.name} — ${stock.totalStock} units remaining`,
        timestamp: now.toISOString(),
      })
    }

    // Add expiry alerts
    for (const exp of expiryAlerts) {
      const severity = exp.daysLeft < 0 ? 'Expired' : `${exp.daysLeft} days left`
      activities.push({
        id: `exp-${exp.medicineName}-${exp.daysLeft}`,
        type: 'expiry',
        title: exp.daysLeft < 0 ? 'Medicine Expired' : 'Expiry Warning',
        description: `${exp.medicineName} — ${severity}`,
        timestamp: now.toISOString(),
      })
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      activities: activities.slice(0, 25),
      summary: {
        salesCount: (recentSales || []).length,
        purchasesCount: (recentPurchases || []).length,
        returnsCount: (recentReturns || []).length,
        lowStockCount: lowStockAlerts.length,
        expiryCount: expiryAlerts.length,
      },
    })
  } catch (error) {
    console.error('GET /api/dashboard/activity error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 })
  }
}
