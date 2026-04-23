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
      select: {
        id: true,
        name: true,
        genericName: true,
        companyName: true,
        composition: true,
        strength: true,
        unitType: true,
        packSize: true,
        gstPercent: true,
      },
      take: 20,
    })

    // Fetch batches separately for medicines with available stock
    const batches = await db.batch.findMany({
      where: {
        medicine: { id: { in: medicines.map(m => m.id) } },
        isActive: true,
        quantity: { gt: 0 },
      },
      orderBy: { expiryDate: 'asc' },
      select: {
        id: true,
        medicineId: true,
        batchNumber: true,
        quantity: true,
        purchasePrice: true,
        mrp: true,
        expiryDate: true,
      },
    })

    // Group batches by medicine
    const batchMap = new Map<string, typeof batches>()
    for (const b of batches) {
      const list = batchMap.get(b.medicineId) ?? []
      list.push(b)
      batchMap.set(b.medicineId, list)
    }

    const available = medicines
      .filter((m) => (batchMap.get(m.id) ?? []).length > 0)
      .map((m) => {
        const medBatches = batchMap.get(m.id)!
        const totalStock = medBatches.reduce((sum, b) => sum + b.quantity, 0)
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
          category: m.unitType,
          totalStock,
          nearestExpiry: medBatches[0]?.expiryDate,
          batches: medBatches.map((b) => ({
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
