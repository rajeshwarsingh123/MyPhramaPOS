import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const topMedicines = await db.saleItem.groupBy({
      by: ['medicineId', 'medicineName'],
      _sum: {
        quantity: true,
        totalAmount: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 8,
    })

    const result = topMedicines.map((item) => ({
      medicineName: item.medicineName || 'Unknown',
      quantitySold: item._sum.quantity || 0,
      totalRevenue: item._sum.totalAmount || 0,
    }))

    return NextResponse.json({ medicines: result })
  } catch (error) {
    console.error('Error fetching top medicines:', error)
    return NextResponse.json({ medicines: [] }, { status: 500 })
  }
}
