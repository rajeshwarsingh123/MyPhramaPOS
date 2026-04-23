import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Aggregate total quantity sold per medicine
    const topSelling = await db.saleItem.groupBy({
      by: ['medicineId', 'medicineName'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })

    if (topSelling.length === 0) {
      return NextResponse.json({ medicines: [] })
    }

    // Get medicine details + latest MRP + total stock for each
    const medicines = await Promise.all(
      topSelling.map(async (item) => {
        const medicine = await db.medicine.findUnique({
          where: { id: item.medicineId },
          select: {
            id: true,
            name: true,
            composition: true,
            strength: true,
            unitType: true,
          },
        })

        if (!medicine) return null

        // Get the latest batch with highest MRP for this medicine (active batches)
        const latestBatch = await db.batch.findFirst({
          where: { medicineId: item.medicineId, isActive: true, quantity: { gt: 0 } },
          orderBy: { mrp: 'desc' },
          select: { mrp: true },
        })

        // Get total stock
        const stockAgg = await db.batch.aggregate({
          where: { medicineId: item.medicineId, isActive: true },
          _sum: { quantity: true },
        })

        return {
          id: medicine.id,
          name: medicine.name,
          composition: medicine.composition || null,
          strength: medicine.strength || null,
          unitType: medicine.unitType,
          mrp: latestBatch?.mrp || 0,
          totalStock: stockAgg._sum.quantity || 0,
          quantitySold: item._sum.quantity || 0,
        }
      })
    )

    return NextResponse.json({
      medicines: medicines.filter(Boolean),
    })
  } catch (error) {
    console.error('GET /api/billing/quick-sale error:', error)
    return NextResponse.json({ error: 'Failed to fetch quick sale medicines' }, { status: 500 })
  }
}
