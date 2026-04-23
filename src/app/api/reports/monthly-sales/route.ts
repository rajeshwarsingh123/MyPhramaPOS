import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
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

    // Monthly totals
    const totals = await db.sale.aggregate({
      _sum: {
        totalAmount: true,
        totalGst: true,
      },
      where: {
        saleDate: { gte: monthStart, lt: monthEnd },
      },
    })

    // Total items sold
    const itemsAgg = await db.saleItem.aggregate({
      _sum: { quantity: true },
      where: {
        sale: {
          saleDate: { gte: monthStart, lt: monthEnd },
        },
      },
    })

    // Daily breakdown
    const sales = await db.sale.findMany({
      where: {
        saleDate: { gte: monthStart, lt: monthEnd },
      },
      include: {
        items: {
          select: { quantity: true },
        },
      },
      orderBy: { saleDate: 'asc' },
    })

    // Group by date
    const dailyMap = new Map<string, { date: string; amount: number; items: number; gst: number }>()

    for (const s of sales) {
      const dayKey = s.saleDate.toISOString().split('T')[0]
      const existing = dailyMap.get(dayKey)
      const items = s.items.reduce((sum, i) => sum + i.quantity, 0)
      if (existing) {
        existing.amount += s.totalAmount
        existing.items += items
        existing.gst += s.totalGst
      } else {
        dailyMap.set(dayKey, { date: dayKey, amount: s.totalAmount, items, gst: s.totalGst })
      }
    }

    const dailyBreakdown = Array.from(dailyMap.values())

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const avgDailySales = daysInMonth > 0 ? (totals._sum.totalAmount ?? 0) / daysInMonth : 0

    return NextResponse.json({
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      totalSales: totals._sum.totalAmount ?? 0,
      totalGst: totals._sum.totalGst ?? 0,
      totalItems: itemsAgg._sum.quantity ?? 0,
      avgDailySales,
      dailyBreakdown,
    })
  } catch (error) {
    console.error('Monthly sales report error:', error)
    return NextResponse.json({ error: 'Failed to fetch monthly sales report' }, { status: 500 })
  }
}
