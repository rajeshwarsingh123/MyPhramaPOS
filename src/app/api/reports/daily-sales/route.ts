import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
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

    // Aggregate totals
    const totals = await db.sale.aggregate({
      _sum: {
        totalAmount: true,
        totalGst: true,
        totalDiscount: true,
      },
      _count: {
        id: true,
      },
      where: {
        saleDate: { gte: dayStart, lt: dayEnd },
      },
    })

    // Total items sold
    const itemsAgg = await db.saleItem.aggregate({
      _sum: { quantity: true },
      where: {
        sale: {
          saleDate: { gte: dayStart, lt: dayEnd },
        },
      },
    })

    // Individual sales
    const sales = await db.sale.findMany({
      where: {
        saleDate: { gte: dayStart, lt: dayEnd },
      },
      include: {
        customer: {
          select: { name: true },
        },
        items: {
          select: { quantity: true },
        },
      },
      orderBy: { saleDate: 'desc' },
    })

    const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0)

    return NextResponse.json({
      date: dayStart.toISOString().split('T')[0],
      totalSales: totals._sum.totalAmount ?? 0,
      totalGst: totals._sum.totalGst ?? 0,
      totalDiscount: totals._sum.totalDiscount ?? 0,
      totalItems,
      sales: sales.map((s) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        customerName: s.customer?.name ?? 'Walk-in',
        saleDate: s.saleDate.toISOString(),
        totalAmount: s.totalAmount,
        totalGst: s.totalGst,
        totalDiscount: s.totalDiscount,
        paymentMode: s.paymentMode,
        itemCount: s.items.reduce((sum, i) => sum + i.quantity, 0),
      })),
    })
  } catch (error) {
    console.error('Daily sales report error:', error)
    return NextResponse.json({ error: 'Failed to fetch daily sales report' }, { status: 500 })
  }
}
