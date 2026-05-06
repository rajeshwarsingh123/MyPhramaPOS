import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const reason = searchParams.get('reason') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('Return')
      .select('*, sale:Sale(invoiceNo, paymentMode, customer:Customer(id, name, phone)), saleItem:SaleItem(medicineName, quantity, discount, mrp, gstAmount, gstPercent)')
      // Note: We need to filter by tenantId, but Return doesn't have it in schema.prisma.
      // However, we can join Sale which has it.
      // Supabase inner join filtering:
      .select('*, sale!inner(invoiceNo, paymentMode, tenantId, customer:Customer(id, name, phone)), saleItem:SaleItem(medicineName, quantity, discount, mrp, gstAmount, gstPercent)')
      .eq('sale.tenantId', tenantId)

    if (reason) {
      query = query.eq('reason', reason)
    }

    if (from) {
      query = query.gte('returnDate', new Date(from).toISOString())
    }
    if (to) {
      query = query.lte('returnDate', new Date(to).toISOString())
    }

    const { data: returns, error } = await query
      .order('returnDate', { ascending: false })
      .limit(Math.min(limit, 100))

    if (error) throw error

    // Filter by search in JS as Supabase doesn't support easy nested search
    let filtered = returns || []
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (r: any) =>
          r.sale.invoiceNo.toLowerCase().includes(q) ||
          r.saleItem.medicineName.toLowerCase().includes(q) ||
          (r.sale.customer?.name && r.sale.customer.name.toLowerCase().includes(q))
      )
    }

    const totalRefund = filtered.reduce((sum, r) => sum + (r.refundAmount || 0), 0)
    const totalItemsReturned = filtered.reduce((sum, r) => sum + (r.returnQty || 0), 0)

    const result = filtered.map((r: any) => ({
      id: r.id,
      saleInvoiceNo: r.sale.invoiceNo,
      originalSaleId: r.saleId,
      saleItemId: r.saleItemId,
      medicineName: r.saleItem.medicineName,
      returnQty: r.returnQty,
      reason: r.reason,
      refundAmount: r.refundAmount,
      returnDate: r.returnDate,
      paymentMode: r.sale.paymentMode,
      customerName: r.sale.customer?.name || 'Walk-in',
    }))

    return NextResponse.json({
      returns: result,
      summary: {
        totalReturns: result.length,
        totalRefund: Math.round(totalRefund * 100) / 100,
        totalItemsReturned,
      },
    })
  } catch (error) {
    console.error('GET /api/billing/return error:', error)
    return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { saleId, items, reason } = body

    if (!saleId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Sale ID and at least one item are required' }, { status: 400 })
    }

    // Fetch original sale
    const { data: originalSale, error: fetchError } = await supabase
      .from('Sale')
      .select('*, items:SaleItem(*, returns:Return(returnQty))')
      .eq('id', saleId)
      .eq('tenantId', tenantId)
      .single()

    if (fetchError || !originalSale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    const originalItemMap = new Map((originalSale.items || []).map((i: any) => [i.id, i]))

    for (const returnItem of items) {
      const saleItemId = returnItem.saleItemId
      const returnQty = returnItem.quantity
      const itemReason = returnItem.reason || reason || ''

      if (!saleItemId || !returnQty || returnQty <= 0) {
        return NextResponse.json({ error: 'Invalid item data' }, { status: 400 })
      }

      if (!itemReason) {
        return NextResponse.json({ error: 'A return reason is required' }, { status: 400 })
      }

      const originalItem: any = originalItemMap.get(saleItemId)
      if (!originalItem) {
        return NextResponse.json({ error: `Item ${saleItemId} not found` }, { status: 400 })
      }

      const alreadyReturned = (originalItem.returns || []).reduce((sum: number, r: any) => sum + (r.returnQty || 0), 0)
      const maxReturnable = (originalItem.quantity || 0) - alreadyReturned

      if (returnQty > maxReturnable) {
        return NextResponse.json({ error: `Cannot return more than ${maxReturnable} units` }, { status: 400 })
      }
    }

    // Generate return invoice number
    const today = new Date()
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0')

    const { data: storeSetting } = await supabase
      .from('StoreSetting')
      .select('*')
      .eq('tenantId', tenantId)
      .maybeSingle()

    let returnInvoiceNo: string
    if (storeSetting) {
      const prefix = storeSetting.invoicePrefix || 'INV'
      const seq = storeSetting.nextInvoiceNo
      returnInvoiceNo = `${prefix}-RET-${dateStr}-${String(seq).padStart(3, '0')}`
      await supabase.from('StoreSetting').update({ nextInvoiceNo: seq + 1 }).eq('id', storeSetting.id)
    } else {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const { count } = await supabase.from('Sale').select('*', { count: 'exact', head: true }).eq('tenantId', tenantId).gte('saleDate', startOfDay)
      returnInvoiceNo = `INV-RET-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`
    }

    // Calculate totals
    let totalReturnAmount = 0
    let totalGst = 0
    let totalDiscount = 0
    const saleItemsData = []
    const returnRecordsData = []

    for (const returnItem of items) {
      const originalItem: any = originalItemMap.get(returnItem.saleItemId)!
      const returnQty = returnItem.quantity
      
      const lineSubtotal = originalItem.mrp * returnQty
      const lineDiscount = lineSubtotal * (originalItem.discount / 100)
      const lineTotal = lineSubtotal - lineDiscount
      const itemGst = (originalItem.gstAmount || 0) * (returnQty / originalItem.quantity)

      totalReturnAmount += lineTotal
      totalGst += itemGst
      totalDiscount += lineDiscount

      saleItemsData.push({
        tenantId,
        batchId: originalItem.batchId,
        medicineId: originalItem.medicineId,
        medicineName: originalItem.medicineName,
        quantity: returnQty,
        mrp: originalItem.mrp,
        discount: originalItem.discount,
        gstPercent: originalItem.gstPercent,
        gstAmount: Math.round(itemGst * 100) / 100,
        totalAmount: Math.round(lineTotal * 100) / 100,
      })

      returnRecordsData.push({
        saleId,
        saleItemId: originalItem.id,
        returnQty,
        reason: returnItem.reason || reason || 'Manual',
        refundAmount: Math.round(lineTotal * 100) / 100,
      })
    }

    // Create return Sale
    const { data: newReturnSale, error: saleError } = await supabase
      .from('Sale')
      .insert({
        tenantId,
        customerId: originalSale.customerId,
        doctorName: originalSale.doctorName,
        invoiceNo: returnInvoiceNo,
        subtotal: Math.round(saleItemsData.reduce((s, i) => s + i.mrp * i.quantity, 0) * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalAmount: Math.round(totalReturnAmount * 100) / 100,
        paymentMode: originalSale.paymentMode,
        notes: `RETURN from ${originalSale.invoiceNo}`,
        saleDate: new Date().toISOString(),
      })
      .select()
      .single()

    if (saleError) throw saleError

    // Create SaleItems for return sale
    const { error: itemsError } = await supabase
      .from('SaleItem')
      .insert(saleItemsData.map(i => ({ ...i, saleId: newReturnSale.id })))

    if (itemsError) throw itemsError

    // Create Return records
    const { error: recordError } = await supabase
      .from('Return')
      .insert(returnRecordsData)

    if (recordError) throw recordError

    // Restore stock to batches
    for (const returnItem of items) {
      const originalItem: any = originalItemMap.get(returnItem.saleItemId)!
      const { data: batch } = await supabase.from('Batch').select('quantity').eq('id', originalItem.batchId).single()
      if (batch) {
        await supabase.from('Batch').update({ quantity: (batch.quantity || 0) + returnItem.quantity, updatedAt: new Date().toISOString() }).eq('id', originalItem.batchId)
      }
    }

    return NextResponse.json(newReturnSale)
  } catch (error) {
    console.error('POST /api/billing/return error:', error)
    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 })
  }
}
