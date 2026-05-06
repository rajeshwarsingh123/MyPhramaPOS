import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('fromDate')
    const toParam = searchParams.get('toDate')

    const now = new Date()
    let fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
    let toDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    if (fromParam) {
      const parsed = new Date(fromParam)
      if (!isNaN(parsed.getTime())) fromDate = parsed
    }
    if (toParam) {
      const parsed = new Date(toParam)
      if (!isNaN(parsed.getTime())) {
        toDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + 1)
      }
    }

    // Fetch all sale items in the date range with batch info
    const { data: saleItems, error } = await supabase
      .from('SaleItem')
      .select('*, batch:Batch(purchasePrice), sale:Sale!inner(saleDate, tenantId)')
      .eq('sale.tenantId', tenantId)
      .gte('sale.saleDate', fromDate.toISOString())
      .lt('sale.saleDate', toDate.toISOString())

    if (error) throw error

    // Aggregate by medicine
    const medicineMap = new Map<
      string,
      { medicineName: string; qtySold: number; revenue: number; cost: number; profit: number }
    >()

    let totalRevenue = 0
    let totalCost = 0

    for (const item of (saleItems || [])) {
      const revenue = item.totalAmount || 0
      const costPerUnit = (item.batch as any)?.purchasePrice || 0
      const cost = costPerUnit * (item.quantity || 0)
      const profit = revenue - cost

      totalRevenue += revenue
      totalCost += cost

      const key = item.medicineId
      const existing = medicineMap.get(key)
      if (existing) {
        existing.qtySold += item.quantity || 0
        existing.revenue += revenue
        existing.cost += cost
        existing.profit += profit
      } else {
        medicineMap.set(key, {
          medicineName: item.medicineName || 'Unknown',
          qtySold: item.quantity || 0,
          revenue,
          cost,
          profit,
        })
      }
    }

    const totalProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    const items = Array.from(medicineMap.values())
      .map((item) => ({
        ...item,
        margin: item.revenue > 0 ? ((item.profit / item.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.profit - a.profit)

    return NextResponse.json({
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: new Date(toDate.getTime() - 1).toISOString().split('T')[0],
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      items,
    })
  } catch (error) {
    console.error('Profit report error:', error)
    return NextResponse.json({ error: 'Failed to fetch profit report' }, { status: 500 })
  }
}
