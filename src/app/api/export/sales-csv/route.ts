import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDateParam = searchParams.get('fromDate')
    const toDateParam = searchParams.get('toDate')

    const now = new Date()
    const fromDate = fromDateParam
      ? new Date(fromDateParam)
      : startOfMonth(now)
    const toDate = toDateParam
      ? new Date(toDateParam)
      : endOfMonth(now)

    // Validate dates
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
    }

    // Start and end of the range
    const rangeStart = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
    const rangeEnd = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1)

    const sales = await db.sale.findMany({
      where: {
        saleDate: { gte: rangeStart, lt: rangeEnd },
      },
      include: {
        customer: {
          select: { name: true },
        },
        items: {
          select: {
            medicineName: true,
            quantity: true,
          },
        },
      },
      orderBy: { saleDate: 'asc' },
    })

    // Build CSV
    const header = 'Invoice#,Date,Customer,Items,Subtotal,Discount,GST,Total,Payment Mode'
    const rows = sales.map((s) => {
      const itemList = s.items.map((i) => `${i.medicineName} x${i.quantity}`).join('; ')
      return [
        s.invoiceNo,
        format(s.saleDate, 'yyyy-MM-dd HH:mm'),
        s.customer?.name ?? 'Walk-in',
        `"${itemList.replace(/"/g, '""')}"`,
        s.subtotal.toFixed(2),
        s.totalDiscount.toFixed(2),
        s.totalGst.toFixed(2),
        s.totalAmount.toFixed(2),
        s.paymentMode,
      ].join(',')
    })

    const csv = [header, ...rows].join('\n')
    const filename = `sales-report-${format(rangeStart, 'yyyy-MM-dd')}-to-${format(toDate, 'yyyy-MM-dd')}.csv`

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
