import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existing = await db.batch.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const body = await request.json()
    const { quantity, mrp, purchasePrice, expiryDate, mfgDate } = body

    const updateData: Record<string, unknown> = {}
    if (quantity !== undefined) updateData.quantity = parseInt(quantity)
    if (mrp !== undefined) updateData.mrp = parseFloat(mrp)
    if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice)
    if (expiryDate !== undefined) updateData.expiryDate = new Date(expiryDate)
    if (mfgDate !== undefined) updateData.mfgDate = mfgDate ? new Date(mfgDate) : null

    const batch = await db.batch.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(batch)
  } catch (error) {
    console.error('PUT /api/batches/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existing = await db.batch.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    await db.batch.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Batch deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/batches/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 })
  }
}
