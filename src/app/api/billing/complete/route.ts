import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, doctorName, paymentMode, discount, items } = body

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
    }

    // 1. Validate items first - check stock availability
    const batchIds = items.map((item: { batchId: string }) => item.batchId)
    const { data: batches, error: batchError } = await supabase
      .from('Batch')
      .select('*, medicine:Medicine(*)')
      .in('id', batchIds)
      .eq('tenantId', tenantId)

    if (batchError || !batches) {
      throw batchError || new Error('Failed to fetch batches')
    }

    const batchMap = new Map(batches.map((b) => [b.id, b]))

    for (const item of items) {
      const batch: any = batchMap.get(item.batchId)
      if (!batch) {
        return NextResponse.json({ error: `Batch not found: ${item.batchId}` }, { status: 400 })
      }
      if (batch.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${batch.medicine.name}. Available: ${batch.quantity}` },
          { status: 400 }
        )
      }
    }

    // 2. Generate invoice number
    const today = new Date()
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0')

    const { data: storeSetting } = await supabase
      .from('StoreSetting')
      .select('*')
      .eq('tenantId', tenantId)
      .maybeSingle()

    let invoiceNo: string
    if (storeSetting) {
      const prefix = storeSetting.invoicePrefix || 'INV'
      const seq = storeSetting.nextInvoiceNo
      invoiceNo = `${prefix}-${dateStr}-${String(seq).padStart(3, '0')}`
      
      await supabase
        .from('StoreSetting')
        .update({ nextInvoiceNo: seq + 1 })
        .eq('id', storeSetting.id)
    } else {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const { count } = await supabase
        .from('Sale')
        .select('*', { count: 'exact', head: true })
        .eq('tenantId', tenantId)
        .gte('saleDate', startOfDay)
        
      invoiceNo = `INV-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`
    }

    // 3. Calculate totals
    let subtotal = 0
    let totalGst = 0
    let totalDiscount = 0
    const saleItemsData = []

    for (const item of items) {
      const batch: any = batchMap.get(item.batchId)!
      const medicine = batch.medicine
      const mrp = item.mrp || batch.mrp
      const qty = item.quantity
      const itemDiscount = item.discount || 0

      const gstPercent = medicine.gstPercent || 0
      const basePrice = (mrp * 100) / (100 + gstPercent)
      const gstAmount = (mrp - basePrice) * qty
      const lineSubtotal = mrp * qty
      const lineDiscount = lineSubtotal * (itemDiscount / 100)
      const lineTotal = lineSubtotal - lineDiscount

      subtotal += lineSubtotal
      totalGst += gstAmount
      totalDiscount += lineDiscount

      saleItemsData.push({
        batchId: item.batchId,
        medicineId: medicine.id,
        medicineName: medicine.name,
        quantity: qty,
        mrp,
        discount: itemDiscount,
        gstPercent,
        gstAmount: Math.round(gstAmount * 100) / 100,
        totalAmount: Math.round(lineTotal * 100) / 100,
      })
    }

    const totalAmount = subtotal - totalDiscount

    // 4. Create Sale
    const { data: newSale, error: saleError } = await supabase
      .from('Sale')
      .insert({
        id: crypto.randomUUID(),
        tenantId,
        customerId: customerId || null,
        doctorName: doctorName || null,
        invoiceNo,
        subtotal: Math.round(subtotal * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        paymentMode: paymentMode || 'cash',
        saleDate: new Date().toISOString(),
      })
      .select()
      .single()

    if (saleError) throw saleError

    // 5. Create SaleItems
    const { error: itemsError } = await supabase
      .from('SaleItem')
      .insert(saleItemsData.map(item => ({ 
        ...item, 
        id: crypto.randomUUID(),
        saleId: newSale.id, 
        tenantId 
      })))

    if (itemsError) throw itemsError

    // 6. Deduct stock from batches
    for (const item of items) {
      const batch: any = batchMap.get(item.batchId)!
      await supabase
        .from('Batch')
        .update({ quantity: batch.quantity - item.quantity, updatedAt: new Date().toISOString() })
        .eq('id', item.batchId)
    }

    return NextResponse.json(newSale)
  } catch (error: any) {
    console.error('Sale completion error:', error)
    return NextResponse.json({ error: error.message || 'Failed to complete sale' }, { status: 500 })
  }
}
