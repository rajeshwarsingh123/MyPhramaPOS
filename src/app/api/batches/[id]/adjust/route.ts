import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existing = await db.batch.findUnique({
      where: { id },
      include: { medicine: { select: { name: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const body = await request.json()
    const { adjustment } = body

    if (typeof adjustment !== 'number' || !Number.isInteger(adjustment)) {
      return NextResponse.json({ error: 'Adjustment must be an integer' }, { status: 400 })
    }

    if (adjustment === 0) {
      return NextResponse.json({ error: 'Adjustment cannot be zero' }, { status: 400 })
    }

    const oldQuantity = existing.quantity
    const newQuantity = oldQuantity + adjustment

    if (newQuantity < 0) {
      return NextResponse.json(
        { error: `Adjustment would result in negative stock (${newQuantity}). Current stock: ${oldQuantity}` },
        { status: 400 },
      )
    }

    const updated = await db.batch.update({
      where: { id },
      data: { quantity: newQuantity },
      include: {
        medicine: { select: { name: true, unitType: true } },
      },
    })

    return NextResponse.json({
      batch: updated,
      oldQuantity,
      newQuantity,
      adjustment,
      medicineName: existing.medicine.name,
    })
  } catch (error) {
    console.error('PUT /api/batches/[id]/adjust error:', error)
    return NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 })
  }
}
