import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fromDateParam = searchParams.get('fromDate')
    const toDateParam = searchParams.get('toDate')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    let rangeStart: Date
    let rangeEnd: Date

    if (fromDateParam && toDateParam) {
      const from = parseISO(fromDateParam)
      const to = parseISO(toDateParam)
      if (!isValid(from) || !isValid(to)) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      rangeStart = new Date(from.getFullYear(), from.getMonth(), from.getDate())
      rangeEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)
    } else if (year && month) {
      rangeStart = new Date(parseInt(year), parseInt(month) - 1, 1)
      rangeEnd = endOfMonth(rangeStart)
      rangeEnd.setHours(23, 59, 59, 999)
    } else {
      const now = new Date()
      rangeStart = startOfMonth(now)
      rangeEnd = endOfMonth(now)
      rangeEnd.setHours(23, 59, 59, 999)
    }

    const { data: sales, error: fetchError } = await supabase
      .from('Sale')
      .select('*, customer:Customer(name), items:SaleItem(medicineName, quantity, mrp, totalAmount)')
      .eq('tenantId', tenantId)
      .gte('saleDate', rangeStart.toISOString())
      .lte('saleDate', rangeEnd.toISOString())
      .order('saleDate', { ascending: true })

    if (fetchError) throw fetchError

    // Build CSV
    const header = 'Invoice#,Date,Customer,Items,Total,Payment Mode'
    const rows = (sales || []).map((s: any) => {
      const itemList = (s.items || []).map((i: any) => `${i.medicineName} (x${i.quantity})`).join('; ')
      return [
        s.invoiceNo,
        format(new Date(s.saleDate), 'yyyy-MM-dd HH:mm'),
        s.customer?.name ?? 'Walk-in',
        `"${itemList.replace(/"/g, '""')}"`,
        (s.totalAmount || 0).toFixed(2),
        (s.paymentMode || 'cash').toUpperCase(),
      ].join(',')
    })

    const csv = [header, ...rows].join('\n')
    const filename = `sales-history-${format(rangeStart, 'yyyy-MM-dd')}-to-${format(rangeEnd, 'yyyy-MM-dd')}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Sales CSV export error:', error)
    return NextResponse.json({ error: 'Failed to export sales CSV' }, { status: 500 })
  }
}
