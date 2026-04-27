import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      totalMedicines,
      batchStats,
      lowStockResult,
      expiredResult,
      expiringResult,
      topMedicinesResult,
      recentSalesResult,
      medicineQualityResult,
    ] = await Promise.all([
      // Total active medicines
      db.medicine.count({ where: { isActive: true } }),

      // Total stock and value
      db.batch.aggregate({
        where: { isActive: true },
        _sum: { quantity: true, mrp: true },
        _count: true,
      }),

      // Low stock: medicines with total stock < 10
      db.$queryRaw<{ medicineId: string; name: string; totalStock: number }[]>`
        SELECT m.id as "medicineId", m.name, COALESCE(SUM(b.quantity), 0) as "totalStock"
        FROM Medicine m
        LEFT JOIN Batch b ON b."medicineId" = m.id AND b."isActive" = 1
        WHERE m."isActive" = 1
        GROUP BY m.id, m.name
        HAVING "totalStock" < 10
        ORDER BY "totalStock" ASC
      `,

      // Expired: batches where expiryDate < now and quantity > 0
      db.batch.count({
        where: { isActive: true, expiryDate: { lt: new Date() }, quantity: { gt: 0 } },
      }),

      // Expiring soon: batches where expiryDate < now + 30 days and quantity > 0 and not expired
      db.batch.count({
        where: {
          isActive: true,
          expiryDate: { gt: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          quantity: { gt: 0 },
        },
      }),

      // Top medicines by sales volume
      db.$queryRaw<{ medicineName: string; totalSold: number; revenue: number }[]>`
        SELECT si."medicineName", CAST(SUM(si.quantity) AS INTEGER) as "totalSold", CAST(SUM(si."totalAmount") AS REAL) as "revenue"
        FROM "SaleItem" si
        GROUP BY si."medicineName"
        ORDER BY "revenue" DESC
        LIMIT 10
      `,

      // Recent 10 sales
      db.sale.findMany({
        take: 10,
        orderBy: { saleDate: 'desc' },
        include: {
          customer: { select: { name: true } },
        },
      }),

      // Data quality: medicines with complete info
      db.medicine.count({
        where: {
          isActive: true,
          genericName: { not: null },
          companyName: { not: null },
          composition: { not: null },
          strength: { not: null },
          category: { not: null },
        },
      }),
    ])

    const totalStock = Number(batchStats._sum.quantity ?? 0)
    const totalStockValue = Number(batchStats._sum.mrp ?? 0)
    // Use quantity * mrp per batch for actual value
    const stockValueResult = await db.batch.aggregate({
      where: { isActive: true },
      _sum: { quantity: true },
    })

    // Calculate total stock value: sum of quantity * mrp per batch
    const allBatches = await db.batch.findMany({
      where: { isActive: true },
      select: { quantity: true, mrp: true },
    })
    const calculatedStockValue = allBatches.reduce((sum, b) => sum + Number(b.quantity) * Number(b.mrp), 0)

    const lowStockCount = lowStockResult.length
    const expiredCount = expiredResult
    const expiringCount = expiringResult

    const topMedicines = topMedicinesResult.map((m) => ({
      name: m.medicineName,
      totalSold: Number(m.totalSold),
      revenue: Number(m.revenue),
    }))

    const recentSales = recentSalesResult.map((s) => ({
      invoiceNo: s.invoiceNo,
      customer: s.customer?.name || 'Walk-in',
      amount: s.totalAmount,
      date: s.saleDate,
    }))

    const totalActiveMedicines = await db.medicine.count({ where: { isActive: true } })

    return NextResponse.json({
      totalMedicines: totalActiveMedicines,
      totalStock,
      totalStockValue: calculatedStockValue,
      lowStockCount,
      expiredCount,
      expiringCount,
      topMedicines,
      recentSales,
      dataQuality: {
        totalMedicines: totalActiveMedicines,
        completeInfo: medicineQualityResult,
        percentage: totalActiveMedicines > 0
          ? Math.round((medicineQualityResult / totalActiveMedicines) * 100)
          : 0,
      },
      stockHealth: {
        totalMedicines: totalActiveMedicines,
        healthyStock: totalActiveMedicines - lowStockCount,
        lowOrExpired: lowStockCount + expiredCount,
        percentage: totalActiveMedicines > 0
          ? Math.round(((totalActiveMedicines - lowStockCount - expiredCount) / totalActiveMedicines) * 100)
          : 0,
      },
    })
  } catch (error) {
    console.error('GET /api/admin/pharmacy-monitor error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pharmacy monitor data' },
      { status: 500 },
    )
  }
}
