import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Total active medicines
    const totalMedicines = await db.medicine.count({
      where: { isActive: true },
    })

    // Total stock across all active batches
    const stockResult = await db.batch.aggregate({
      _sum: { quantity: true },
      where: { isActive: true },
    })
    const totalStock = stockResult._sum.quantity ?? 0

    // Today's sales
    const todaySalesResult = await db.sale.aggregate({
      _sum: { totalAmount: true },
      where: { saleDate: { gte: todayStart } },
    })
    const todaySales = todaySalesResult._sum.totalAmount ?? 0

    // Month sales
    const monthSalesResult = await db.sale.aggregate({
      _sum: { totalAmount: true },
      where: { saleDate: { gte: monthStart } },
    })
    const monthSales = monthSalesResult._sum.totalAmount ?? 0

    // Low stock: medicines where total stock across all active batches < 10
    const lowStockMedicines = await db.medicine.findMany({
      where: {
        isActive: true,
        batches: {
          some: { isActive: true },
        },
      },
      select: {
        id: true,
        name: true,
        unitType: true,
        batches: {
          where: { isActive: true },
          select: { quantity: true },
        },
      },
    })
    const lowStockCount = lowStockMedicines.filter(
      (m) => m.batches.reduce((sum, b) => sum + b.quantity, 0) < 10
    ).length

    // Expiring soon: batches expiring within 30 days with stock > 0
    const expiringSoonCount = await db.batch.count({
      where: {
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: { gte: now, lte: thirtyDaysFromNow },
      },
    })

    // Expired: batches already expired with stock > 0
    const expiredCount = await db.batch.count({
      where: {
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: { lt: now },
      },
    })

    // Recent sales (last 5)
    const recentSales = await db.sale.findMany({
      take: 5,
      orderBy: { saleDate: 'desc' },
      include: {
        customer: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({
      totalMedicines,
      totalStock,
      todaySales,
      monthSales,
      lowStockCount,
      expiringSoonCount,
      expiredCount,
      recentSales: recentSales.map((s) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        customerName: s.customer?.name ?? 'Walk-in',
        saleDate: s.saleDate.toISOString(),
        totalAmount: s.totalAmount,
        paymentMode: s.paymentMode,
      })),
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}
