import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const medicines = await db.medicine.findMany({
      where: {
        isActive: true,
        batches: {
          some: { isActive: true },
        },
      },
      select: {
        id: true,
        name: true,
        composition: true,
        unitType: true,
        batches: {
          where: { isActive: true },
          select: { quantity: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const items = medicines
      .map((med) => {
        const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0)
        return {
          medicineName: med.name,
          composition: med.composition,
          unitType: med.unitType,
          totalStock,
          batchCount: med.batches.length,
        }
      })
      .filter((m) => m.totalStock < 10)
      .sort((a, b) => a.totalStock - b.totalStock)

    return NextResponse.json({
      items,
    })
  } catch (error) {
    console.error('Low stock report error:', error)
    return NextResponse.json({ error: 'Failed to fetch low stock report' }, { status: 500 })
  }
}
