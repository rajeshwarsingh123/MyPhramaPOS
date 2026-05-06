import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('purchase_bills')
      .select('*, supplier:Supplier(name), items:purchase_items(count)', { count: 'exact' })
      .eq('tenant_id', tenantId)

    if (search) {
      query = query.ilike('invoice_no', `%${search}%`)
    }

    if (fromDate) query = query.gte('invoice_date', fromDate)
    if (toDate) query = query.lte('invoice_date', toDate)

    const { data: bills, count, error } = await query
      .order('invoice_date', { ascending: false })
      .range(skip, skip + limit - 1)

    if (error) throw error

    const formattedBills = (bills || []).map(b => ({
      id: b.id,
      invoiceNo: b.invoice_no,
      invoiceDate: b.invoice_date,
      totalAmount: b.total_amount,
      totalGst: b.total_gst,
      paymentType: b.payment_type,
      notes: b.notes,
      supplier: b.supplier,
      itemCount: b.items?.[0]?.count || 0,
      createdAt: b.created_at
    }))

    return NextResponse.json({
      purchases: formattedBills,
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('GET /api/purchases error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch purchases' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId, invoiceNo, invoiceDate, paymentType, notes, items } = body

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supplierId || !invoiceNo || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for duplicate invoice number
    const { data: existingBill } = await supabase
      .from('purchase_bills')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('invoice_no', invoiceNo)
      .maybeSingle()

    if (existingBill) {
      return NextResponse.json({ error: `Invoice number ${invoiceNo} already exists for this tenant.` }, { status: 400 })
    }

    let totalAmount = 0
    let totalGst = 0

    // 1. Create the Purchase Bill
    const { data: bill, error: billErr } = await supabase
      .from('purchase_bills')
      .insert({
        tenant_id: tenantId,
        supplier_id: supplierId,
        invoice_no: invoiceNo,
        invoice_date: invoiceDate || new Date().toISOString(),
        payment_type: paymentType || 'cash',
        notes: notes || null,
      })
      .select()
      .single()

    if (billErr) throw billErr

    // 2. Process each item
    for (const item of items) {
      const qty = parseInt(item.quantity) || 0
      const price = parseFloat(item.purchasePrice) || 0
      const mrp = parseFloat(item.mrp) || 0
      const gstPercent = parseFloat(item.gstPercent) || 5
      
      const itemSubtotal = qty * price
      const itemGst = (itemSubtotal * gstPercent) / 100
      const itemTotal = itemSubtotal + itemGst

      totalAmount += itemTotal
      totalGst += itemGst

      // Find or Create Batch (Using PascalCase Batch)
      let batchId: string
      const { data: existingBatch } = await supabase
        .from('Batch')
        .select('id, quantity')
        .eq('tenantId', tenantId)
        .eq('medicineId', item.medicineId)
        .eq('batchNumber', item.batchNumber)
        .maybeSingle()

      if (existingBatch) {
        batchId = existingBatch.id
        await supabase
          .from('Batch')
          .update({
            quantity: (existingBatch.quantity || 0) + qty,
            purchasePrice: price,
            mrp: mrp,
            expiryDate: item.expiryDate,
            updatedAt: new Date().toISOString()
          })
          .eq('id', batchId)
      } else {
        const { data: newBatch, error: batchErr } = await supabase
          .from('Batch')
          .insert({
            tenantId: tenantId,
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            purchasePrice: price,
            mrp: mrp,
            quantity: qty,
            initialQuantity: qty,
            isActive: true,
          })
          .select()
          .single()
        
        if (batchErr) throw batchErr
        batchId = newBatch.id
      }

      // Create Purchase Item
      const { error: itemErr } = await supabase
        .from('purchase_items')
        .insert({
          tenant_id: tenantId,
          bill_id: bill.id,
          medicine_id: item.medicineId,
          batch_id: batchId,
          quantity: qty,
          purchase_price: price,
          mrp: mrp,
          gst_percent: gstPercent,
          total_amount: itemTotal,
        })
      
      if (itemErr) throw itemErr

      // Update Medicine total_stock (Using PascalCase Medicine)
      // Note: Medicine doesn't have total_stock in schema.prisma!
      // I'll skip it or check if it exists.
      // Since schema.prisma doesn't have it, I'll assume we compute it or it's missing.
    }

    // 3. Update Bill with totals
    await supabase
      .from('purchase_bills')
      .update({
        total_amount: totalAmount,
        total_gst: totalGst,
      })
      .eq('id', bill.id)

    return NextResponse.json({ ...bill, total_amount: totalAmount, total_gst: totalGst }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/purchases error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create purchase order' }, { status: 500 })
  }
}
