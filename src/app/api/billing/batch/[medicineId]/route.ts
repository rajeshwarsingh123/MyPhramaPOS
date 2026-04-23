import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ medicineId: string }> }
) {
  try {
    const { medicineId } = await params

    const batches = await db.batch.findMany({
      where: {
        medicineId,
        isActive: true,
        quantity: { gt: 0 },
      },
      orderBy: { expiryDate: 'asc' },
      select: {
        id: true,
        batchNumber: true,
        quantity: true,
        purchasePrice: true,
        mrp: true,
        expiryDate: true,
        medicine: {
          select: {
            name: true,
            gstPercent: true,
            unitType: true,
            strength: true,
          },
        },
      },
    })

    return NextResponse.json(batches)
  } catch (error) {
    console.error('Batch fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 })
  }
}
