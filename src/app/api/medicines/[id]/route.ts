import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const medicine = await db.medicine.findUnique({
      where: { id },
      include: {
        batches: {
          where: { isActive: true },
          orderBy: { expiryDate: 'asc' },
        },
      },
    })

    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }

    const totalStock = medicine.batches.reduce((sum, b) => sum + b.quantity, 0)
    const activeBatches = medicine.batches.filter((b) => b.quantity > 0)
    const earliestExpiry =
      activeBatches.length > 0
        ? activeBatches.reduce((earliest, b) =>
            b.expiryDate < earliest ? b.expiryDate : earliest,
            activeBatches[0].expiryDate,
          )
        : null

    return NextResponse.json({
      ...medicine,
      totalStock,
      earliestExpiry,
      batchCount: medicine.batches.length,
    })
  } catch (error) {
    console.error('GET /api/medicines/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch medicine' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.medicine.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }

    const {
      name,
      genericName,
      companyName,
      composition,
      strength,
      unitType,
      packSize,
      gstPercent,
      sellingPrice,
      marginPercent,
    } = body

    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 })
    }

    const medicine = await db.medicine.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(genericName !== undefined ? { genericName: genericName?.trim() || null } : {}),
        ...(companyName !== undefined ? { companyName: companyName?.trim() || null } : {}),
        ...(composition !== undefined ? { composition: composition?.trim() || null } : {}),
        ...(strength !== undefined ? { strength: strength?.trim() || null } : {}),
        ...(unitType !== undefined ? { unitType } : {}),
        ...(packSize !== undefined ? { packSize: packSize?.trim() || null } : {}),
        ...(gstPercent !== undefined ? { gstPercent: parseFloat(gstPercent) } : {}),
        ...(sellingPrice !== undefined ? { sellingPrice: parseFloat(sellingPrice) } : {}),
        ...(marginPercent !== undefined ? { marginPercent: parseFloat(marginPercent) } : {}),
      },
      include: {
        batches: {
          where: { isActive: true },
          orderBy: { expiryDate: 'asc' },
        },
      },
    })

    const totalStock = medicine.batches.reduce((sum, b) => sum + b.quantity, 0)
    const activeBatches = medicine.batches.filter((b) => b.quantity > 0)
    const earliestExpiry =
      activeBatches.length > 0
        ? activeBatches.reduce((earliest, b) =>
            b.expiryDate < earliest ? b.expiryDate : earliest,
            activeBatches[0].expiryDate,
          )
        : null

    return NextResponse.json({
      ...medicine,
      totalStock,
      earliestExpiry,
      batchCount: medicine.batches.length,
    })
  } catch (error) {
    console.error('PUT /api/medicines/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update medicine' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existing = await db.medicine.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }

    await db.medicine.update({
      where: { id },
      data: { isActive: false },
    })

    // Also soft-delete all batches
    await db.batch.updateMany({
      where: { medicineId: id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Medicine deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/medicines/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete medicine' }, { status: 500 })
  }
}
