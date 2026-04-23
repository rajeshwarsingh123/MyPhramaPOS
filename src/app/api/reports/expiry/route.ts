import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    // Fetch all active batches with stock > 0 and their medicine info
    const batches = await db.batch.findMany({
      where: {
        isActive: true,
        quantity: { gt: 0 },
      },
      include: {
        medicine: {
          select: {
            name: true,
            composition: true,
            unitType: true,
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
    })

    type ExpiryItem = {
      id: string
      batchNumber: string
      medicineName: string
      composition: string | null
      unitType: string
      quantity: number
      mrp: number
      expiryDate: string
      daysLeft: number
      valueAtRisk: number
    }

    const expired: ExpiryItem[] = []
    const expiring7d: ExpiryItem[] = []
    const expiring30d: ExpiryItem[] = []
    const expiring90d: ExpiryItem[] = []

    for (const batch of batches) {
      const daysLeft = Math.ceil(
        (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const valueAtRisk = batch.quantity * batch.mrp

      const item: ExpiryItem = {
        id: batch.id,
        batchNumber: batch.batchNumber,
        medicineName: batch.medicine.name,
        composition: batch.medicine.composition,
        unitType: batch.medicine.unitType,
        quantity: batch.quantity,
        mrp: batch.mrp,
        expiryDate: batch.expiryDate.toISOString(),
        daysLeft,
        valueAtRisk,
      }

      if (daysLeft < 0) {
        expired.push(item)
      } else if (daysLeft <= 7) {
        expiring7d.push(item)
      } else if (daysLeft <= 30) {
        expiring30d.push(item)
      } else if (daysLeft <= 90) {
        expiring90d.push(item)
      }
    }

    return NextResponse.json({
      expired,
      expiring7d,
      expiring30d,
      expiring90d,
    })
  } catch (error) {
    console.error('Expiry report error:', error)
    return NextResponse.json({ error: 'Failed to fetch expiry report' }, { status: 500 })
  }
}
