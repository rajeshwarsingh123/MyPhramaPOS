import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()

    // Get last 7 days of sales data
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const salesByDay = await db.sale.groupBy({
      by: ['saleDate'],
      where: {
        saleDate: { gte: sevenDaysAgo },
      },
      _sum: {
        totalAmount: true,
        subtotal: true,
        totalDiscount: true,
      },
      _count: {
        id: true,
      },
      orderBy: { saleDate: 'asc' },
    })

    // Build a map of all 7 days, filling in zeros for days with no sales
    const dailyData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayData = salesByDay.find((s) => {
        const saleDateStr = new Date(s.saleDate).toISOString().split('T')[0]
        return saleDateStr === dateStr
      })

      dailyData.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        shortDate: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        totalSales: dayData?._sum.totalAmount ?? 0,
        subtotal: dayData?._sum.subtotal ?? 0,
        totalDiscount: dayData?._sum.totalDiscount ?? 0,
        orderCount: dayData?._count.id ?? 0,
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
