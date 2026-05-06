import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function POST(
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
      .select('*, medicine:Medicine(name)')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const body = await request.json()
    const { quantityChange, reason } = body

    if (typeof quantityChange !== 'number' || !Number.isInteger(quantityChange)) {
      return NextResponse.json({ error: 'quantityChange must be an integer' }, { status: 400 })
    }

    if (quantityChange === 0) {
      return NextResponse.json({ error: 'quantityChange cannot be zero' }, { status: 400 })
    }

    const validReasons = ['Received', 'Damaged', 'Returned', 'Physical Count', 'Other']
    if (reason && !validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
    }

    const oldQuantity = existing.quantity
    const newQuantity = oldQuantity + quantityChange

    if (newQuantity < 0) {
      return NextResponse.json(
        { error: `Adjustment would result in negative stock (${newQuantity}). Current stock: ${oldQuantity}` },
        { status: 400 },
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('Batch')
      .update({ quantity: newQuantity, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select('*, medicine:Medicine(name, unitType)')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      batch: updated,
      oldQuantity,
      newQuantity,
      quantityChange,
      reason: reason || 'Manual',
      medicineName: (existing.medicine as any).name,
    })
  } catch (error) {
    console.error('POST /api/batches/[id]/adjust error:', error)
    return NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Logic is same as POST but uses 'adjustment' in body
  try {
    const { id } = await params
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('Batch')
      .select('*, medicine:Medicine(name)')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .single()

    if (fetchError || !existing) {
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

    const { data: updated, error: updateError } = await supabase
      .from('Batch')
      .update({ quantity: newQuantity, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select('*, medicine:Medicine(name, unitType)')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      batch: updated,
      oldQuantity,
      newQuantity,
      adjustment,
      medicineName: (existing.medicine as any).name,
    })
  } catch (error) {
    console.error('PUT /api/batches/[id]/adjust error:', error)
    return NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 })
  }
}
