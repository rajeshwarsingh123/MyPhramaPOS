import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone, email, address, gstNumber, isActive } = body

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await db.supplier.findFirst({
      where: { id, tenantId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const supplier = await db.supplier.update({
      where: { id, tenantId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        phone: phone !== undefined ? (phone?.trim() || null) : undefined,
        email: email !== undefined ? (email?.trim() || null) : undefined,
        address: address !== undefined ? (address?.trim() || null) : undefined,
        gstNumber: gstNumber !== undefined ? (gstNumber?.trim() || null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('PUT /api/suppliers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await db.supplier.findFirst({
      where: { id, tenantId }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Check if supplier has purchase orders
    const purchaseCount = await db.purchaseOrder.count({
      where: { supplierId: id, tenantId },
    })

    // Soft delete
    await db.supplier.update({
      where: { id, tenantId },
      data: { isActive: false },
    })

    return NextResponse.json({
      message: `Supplier ${existing.name} deleted successfully`,
      hadPurchases: purchaseCount > 0,
      purchaseCount,
    })
  } catch (error) {
    console.error('DELETE /api/suppliers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}
