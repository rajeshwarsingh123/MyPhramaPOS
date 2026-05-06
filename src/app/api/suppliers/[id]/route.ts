import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone, email, address, gstNumber } = body

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('Supplier')
      .select('id')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (email !== undefined) updateData.email = email?.trim() || null
    if (address !== undefined) updateData.address = address?.trim() || null
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber?.trim() || null
    updateData.updatedAt = new Date().toISOString()

    const { data: supplier, error: updateError } = await supabase
      .from('Supplier')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

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

    const { data: existing, error: fetchError } = await supabase
      .from('Supplier')
      .select('id, name')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Check if supplier has purchase orders (using purchase_bills for now)
    const { count: purchaseCount, error: countError } = await supabase
      .from('purchase_bills')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', id)
      .eq('tenant_id', tenantId)

    if (countError) throw countError

    // Since schema doesn't have isActive, we'll actually delete.
    const { error: deleteError } = await supabase
      .from('Supplier')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      message: `Supplier ${existing.name} deleted successfully`,
      hadPurchases: (purchaseCount || 0) > 0,
      purchaseCount: purchaseCount || 0,
    })
  } catch (error) {
    console.error('DELETE /api/suppliers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}
