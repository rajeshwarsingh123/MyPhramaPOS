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
    const monthParam = searchParams.get('month')

    let year: number
    let month: number

    if (monthParam) {
      const parts = monthParam.split('-')
      if (parts.length !== 2) {
        return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM.' }, { status: 400 })
      }
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10) - 1
      if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
        return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM.' }, { status: 400 })
      }
    } else {
      const now = new Date()
      year = now.getFullYear()
      month = now.getMonth()
    }

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 1)

    const { data: sales, error } = await supabase
      .from('Sale')
      .select('saleDate, totalAmount, totalGst, items:SaleItem(quantity)')
      .eq('tenantId', tenantId)
      .gte('saleDate', monthStart.toISOString())
      .lt('saleDate', monthEnd.toISOString())
      .order('saleDate', { ascending: true })

    if (error) throw error

    let totalSales = 0
    let totalGst = 0
    let totalItems = 0
    const dailyMap = new Map<string, { date: string; amount: number; items: number; gst: number }>()

    for (const s of (sales || [])) {
      const dayKey = new Date(s.saleDate).toISOString().split('T')[0]
      const itemsCount = (s.items || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
      
      totalSales += s.totalAmount || 0
      totalGst += s.totalGst || 0
      totalItems += itemsCount

      const existing = dailyMap.get(dayKey)
      if (existing) {
        existing.amount += s.totalAmount || 0
        existing.items += itemsCount
        existing.gst += s.totalGst || 0
      } else {
        dailyMap.set(dayKey, { date: dayKey, amount: s.totalAmount || 0, items: itemsCount, gst: s.totalGst || 0 })
      }
    }

    const dailyBreakdown = Array.from(dailyMap.values())
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const avgDailySales = daysInMonth > 0 ? totalSales / daysInMonth : 0

    return NextResponse.json({
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      totalSales,
      totalGst,
      totalItems,
      avgDailySales,
      dailyBreakdown,
    })
  } catch (error) {
    console.error('Monthly sales report error:', error)
    return NextResponse.json({ error: 'Failed to fetch monthly sales report' }, { status: 500 })
  }
}
