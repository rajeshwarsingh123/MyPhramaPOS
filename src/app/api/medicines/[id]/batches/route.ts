import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: medicineId } = await params
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: medicine, error: medError } = await supabase
      .from('Medicine')
      .select('*')
      .eq('id', medicineId)
      .eq('tenantId', tenantId)
      .single()

    if (medError || !medicine) {
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
        (parsedPurchasePrice * (1 + (medicine.marginPercent || 0) / 100)).toFixed(2),
      )
      // Update the medicine selling price
      await supabase
        .from('Medicine')
        .update({ sellingPrice: calculatedSellingPrice, updatedAt: new Date().toISOString() })
        .eq('id', medicineId)
    }

    const { data: batch, error: batchError } = await supabase
      .from('Batch')
      .insert({
        id: crypto.randomUUID(),
        tenantId,
        medicineId,
        batchNumber: batchNumber?.trim() || `BATCH-${Date.now()}`,
        expiryDate: new Date(expiryDate).toISOString(),
        mfgDate: mfgDate ? new Date(mfgDate).toISOString() : null,
        purchasePrice: parsedPurchasePrice,
        mrp: parsedMrp,
        quantity: parsedQuantity,
        initialQuantity: parsedQuantity,
        isActive: true,
      })
      .select()
      .single()

    if (batchError) throw batchError

    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    console.error('POST /api/medicines/[id]/batches error:', error)
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
  }
}
