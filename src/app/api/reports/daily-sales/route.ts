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
    const dateParam = searchParams.get('date')

    let targetDate: Date
    if (dateParam) {
      const parsed = new Date(dateParam)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
      }
      targetDate = parsed
    } else {
      targetDate = new Date()
    }

    // Start and end of the target date
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)

    const { data: sales, error } = await supabase
      .from('Sale')
      .select('*, customer:Customer(name), items:SaleItem(quantity)')
      .eq('tenantId', tenantId)
      .gte('saleDate', dayStart.toISOString())
      .lt('saleDate', dayEnd.toISOString())
      .order('saleDate', { ascending: false })

    if (error) throw error

    let totalSales = 0
    let totalGst = 0
    let totalDiscount = 0
    let totalItems = 0

    const formattedSales = (sales || []).map((s: any) => {
      const saleTotalItems = (s.items || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
      
      totalSales += s.totalAmount || 0
      totalGst += s.totalGst || 0
      totalDiscount += s.totalDiscount || 0
      totalItems += saleTotalItems

      return {
        id: s.id,
        invoiceNo: s.invoiceNo,
        customerName: (s.customer as any)?.name ?? 'Walk-in',
        saleDate: s.saleDate,
        totalAmount: s.totalAmount,
        totalGst: s.totalGst,
        totalDiscount: s.totalDiscount,
        paymentMode: s.paymentMode,
        itemCount: saleTotalItems,
      }
    })

    return NextResponse.json({
      date: dayStart.toISOString().split('T')[0],
      totalSales,
      totalGst,
      totalDiscount,
      totalItems,
      sales: formattedSales,
    })
  } catch (error) {
    console.error('Daily sales report error:', error)
    return NextResponse.json({ error: 'Failed to fetch daily sales report' }, { status: 500 })
  }
}
