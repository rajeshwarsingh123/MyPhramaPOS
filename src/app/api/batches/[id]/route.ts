import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('Batch')
      .select('id')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const body = await request.json()
    const { quantity, mrp, purchasePrice, expiryDate, mfgDate } = body

    const updateData: any = {}
    if (quantity !== undefined) updateData.quantity = parseInt(quantity)
    if (mrp !== undefined) updateData.mrp = parseFloat(mrp)
    if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice)
    if (expiryDate !== undefined) updateData.expiryDate = new Date(expiryDate).toISOString()
    if (mfgDate !== undefined) updateData.mfgDate = mfgDate ? new Date(mfgDate).toISOString() : null
    updateData.updatedAt = new Date().toISOString()

    const { data: batch, error: updateError } = await supabase
      .from('Batch')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

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
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('Batch')
      .select('id')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('Batch')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Batch deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/batches/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 })
  }
}
