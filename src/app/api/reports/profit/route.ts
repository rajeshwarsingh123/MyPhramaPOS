import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
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

    // Fetch all sale items in the date range with batch and medicine info
    const saleItems = await db.saleItem.findMany({
      where: {
        sale: {
          saleDate: { gte: fromDate, lt: toDate },
        },
      },
      include: {
        batch: {
          select: { purchasePrice: true },
        },
      },
    })

    // Aggregate by medicine
    const medicineMap = new Map<
      string,
      { medicineName: string; qtySold: number; revenue: number; cost: number; profit: number }
    >()

    let totalRevenue = 0
    let totalCost = 0

    for (const item of saleItems) {
      const revenue = item.totalAmount
      const costPerUnit = item.batch.purchasePrice
      const cost = costPerUnit * item.quantity
      const profit = revenue - cost

      totalRevenue += revenue
      totalCost += cost

      const existing = medicineMap.get(item.medicineId)
      if (existing) {
        existing.qtySold += item.quantity
        existing.revenue += revenue
        existing.cost += cost
        existing.profit += profit
      } else {
        medicineMap.set(item.medicineId, {
          medicineName: item.medicineName,
          qtySold: item.quantity,
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
