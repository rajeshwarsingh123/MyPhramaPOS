import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // Aggregate total sales by payment mode for current month
    const salesByMode = await db.sale.groupBy({
      by: ['paymentMode'],
      where: {
        saleDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    })

    const modes: Record<string, number> = {
      cash: 0,
      card: 0,
      upi: 0,
      credit: 0,
    }

    for (const item of salesByMode) {
      modes[item.paymentMode] = (modes[item.paymentMode] ?? 0) + (item._sum.totalAmount ?? 0)
    }

    const totals = Object.values(modes).reduce((sum, v) => sum + v, 0)

    return NextResponse.json({
      modes,
      totals,
    })
  } catch (error) {
    console.error('Payment modes error:', error)
    return NextResponse.json({ error: 'Failed to fetch payment mode data' }, { status: 500 })
  }
}
