import { supabase } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const { data: sales, error } = await supabase
      .from('Sale')
      .select('saleDate, totalAmount, subtotal, totalDiscount')
      .eq('tenantId', tenantId)
      .gte('saleDate', sevenDaysAgo.toISOString())

    if (error) throw error

    // Aggregate by day in JS
    const salesByDayMap: Record<string, any> = {}
    
    for (const sale of (sales || [])) {
      const dateStr = new Date(sale.saleDate).toISOString().split('T')[0]
      if (!salesByDayMap[dateStr]) {
        salesByDayMap[dateStr] = { totalAmount: 0, subtotal: 0, totalDiscount: 0, count: 0 }
      }
      salesByDayMap[dateStr].totalAmount += sale.totalAmount
      salesByDayMap[dateStr].subtotal += sale.subtotal
      salesByDayMap[dateStr].totalDiscount += sale.totalDiscount
      salesByDayMap[dateStr].count += 1
    }

    // Build a map of all 7 days, filling in zeros for days with no sales
    const dailyData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayData = salesByDayMap[dateStr]

      dailyData.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        shortDate: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        totalSales: dayData?.totalAmount ?? 0,
        subtotal: dayData?.subtotal ?? 0,
        totalDiscount: dayData?.totalDiscount ?? 0,
        orderCount: dayData?.count ?? 0,
      })
    }

    return NextResponse.json({ data: dailyData })
  } catch (error) {
    console.error('Sales trend error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales trend' },
      { status: 500 }
    )
  }
}
