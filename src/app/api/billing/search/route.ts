import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    const medicines = await db.medicine.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q } },
          { genericName: { contains: q } },
          { composition: { contains: q } },
        ],
      },
      include: {
        batches: {
          where: {
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
          },
        },
      },
      take: 20,
    })

    // Filter out medicines with no available batches
    const available = medicines
      .filter((m) => m.batches.length > 0)
      .map((m) => {
        const totalStock = m.batches.reduce((sum, b) => sum + b.quantity, 0)
        return {
          id: m.id,
          name: m.name,
          genericName: m.genericName,
          companyName: m.companyName,
          composition: m.composition,
          strength: m.strength,
          unitType: m.unitType,
          packSize: m.packSize,
          gstPercent: m.gstPercent,
          totalStock,
          nearestExpiry: m.batches[0]?.expiryDate,
          batches: m.batches.map((b) => ({
            id: b.id,
            batchNumber: b.batchNumber,
            qty: b.quantity,
            purchasePrice: b.purchasePrice,
            mrp: b.mrp,
            expiryDate: b.expiryDate,
          })),
        }
      })

    return NextResponse.json(available)
  } catch (error) {
    console.error('Billing search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
