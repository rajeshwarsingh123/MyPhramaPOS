import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    // Today's sales total
    const salesAgg = await db.sale.aggregate({
      _sum: { totalAmount: true },
      where: {
        saleDate: { gte: todayStart, lt: todayEnd },
      },
    })

    // Low stock count (total stock < 10)
    const medicines = await db.medicine.findMany({
      where: { isActive: true },
      include: {
        batches: {
          where: { isActive: true },
          select: { quantity: true },
        },
      },
    })

    const lowStockCount = medicines.filter(
      (m) => m.batches.reduce((sum, b) => sum + b.quantity, 0) < 10
    ).length

    // Expired count (batches with expiry before today and quantity > 0)
    const expiredCount = await db.batch.count({
      where: {
        isActive: true,
        expiryDate: { lt: now },
        quantity: { gt: 0 },
      },
    })

    return NextResponse.json({
      todaySales: salesAgg._sum.totalAmount ?? 0,
      lowStockCount,
      expiredCount,
    })
  } catch (error) {
    console.error('Quick stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch quick stats' }, { status: 500 })
  }
}
