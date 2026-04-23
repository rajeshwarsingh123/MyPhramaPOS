import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: medicineId } = await params

    const medicine = await db.medicine.findUnique({
      where: { id: medicineId, isActive: true },
    })

    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }

    const body = await request.json()
    const { batchNumber, expiryDate, mfgDate, purchasePrice, mrp, quantity } = body

    if (!expiryDate) {
      return NextResponse.json({ error: 'Expiry date is required' }, { status: 400 })
    }

    if (quantity === undefined || parseInt(quantity) < 0) {
      return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 })
    }

    const parsedQuantity = parseInt(quantity)
    const parsedPurchasePrice = parseFloat(purchasePrice) || 0
    const parsedMrp = parseFloat(mrp) || 0

    // Auto-calculate selling price if margin% is set
    let calculatedSellingPrice = medicine.sellingPrice
    if (medicine.marginPercent > 0 && parsedPurchasePrice > 0) {
      calculatedSellingPrice = parseFloat(
        (parsedPurchasePrice * (1 + medicine.marginPercent / 100)).toFixed(2),
      )
      // Update the medicine selling price
      await db.medicine.update({
        where: { id: medicineId },
        data: { sellingPrice: calculatedSellingPrice },
      })
    }

    const batch = await db.batch.create({
      data: {
        medicineId,
        batchNumber: batchNumber?.trim() || `BATCH-${Date.now()}`,
        expiryDate: new Date(expiryDate),
        mfgDate: mfgDate ? new Date(mfgDate) : null,
        purchasePrice: parsedPurchasePrice,
        mrp: parsedMrp,
        quantity: parsedQuantity,
        initialQuantity: parsedQuantity,
      },
    })

    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    console.error('POST /api/medicines/[id]/batches error:', error)
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
  }
}
