import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: medicine, error } = await supabase
      .from('Medicine')
      .select('*, batches:Batch(*)')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .single()

    if (error || !medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }

    const activeBatches = (medicine.batches || []).filter((b: any) => b.isActive)
    const totalStock = activeBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)
    const batchesWithStock = activeBatches.filter((b: any) => b.quantity > 0)
    
    const earliestExpiry =
      batchesWithStock.length > 0
        ? batchesWithStock.reduce((earliest: string, b: any) =>
            new Date(b.expiryDate) < new Date(earliest) ? b.expiryDate : earliest,
            batchesWithStock[0].expiryDate,
          )
        : null

    return NextResponse.json({
      ...medicine,
      totalStock,
      earliestExpiry,
      batchCount: activeBatches.length,
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
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from('Medicine')
      .select('id')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .single()

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

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (genericName !== undefined) updateData.genericName = genericName?.trim() || null
    if (companyName !== undefined) updateData.companyName = companyName?.trim() || null
    if (composition !== undefined) updateData.composition = composition?.trim() || null
    if (strength !== undefined) updateData.strength = strength?.trim() || null
    if (unitType !== undefined) updateData.unitType = unitType
    if (packSize !== undefined) updateData.packSize = packSize?.trim() || null
    if (gstPercent !== undefined) updateData.gstPercent = parseFloat(gstPercent)
    if (sellingPrice !== undefined) updateData.sellingPrice = parseFloat(sellingPrice)
    if (marginPercent !== undefined) updateData.marginPercent = parseFloat(marginPercent)
    updateData.updatedAt = new Date().toISOString()

    const { data: medicine, error: updateError } = await supabase
      .from('Medicine')
      .update(updateData)
      .eq('id', id)
      .select('*, batches:Batch(*)')
      .single()

    if (updateError) throw updateError

    const activeBatches = (medicine.batches || []).filter((b: any) => b.isActive)
    const totalStock = activeBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)
    const batchesWithStock = activeBatches.filter((b: any) => b.quantity > 0)
    const earliestExpiry =
      batchesWithStock.length > 0
        ? batchesWithStock.reduce((earliest: string, b: any) =>
            new Date(b.expiryDate) < new Date(earliest) ? b.expiryDate : earliest,
            batchesWithStock[0].expiryDate,
          )
        : null

    return NextResponse.json({
      ...medicine,
      totalStock,
      earliestExpiry,
      batchCount: activeBatches.length,
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
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from('Medicine')
      .select('id')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }

    // Soft delete medicine
    await supabase
      .from('Medicine')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', id)

    // Also soft-delete all batches
    await supabase
      .from('Batch')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('medicineId', id)

    return NextResponse.json({ message: 'Medicine deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/medicines/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete medicine' }, { status: 500 })
  }
}
