import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: bill, error } = await supabase
      .from('purchase_bills')
      .select('*, supplier:Supplier(*), items:purchase_items(*, medicine:Medicine(*), batch:Batch(*))')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !bill) {
      return NextResponse.json({ error: 'Purchase bill not found' }, { status: 404 })
    }

    // Format the response to match the frontend expectations
    const formattedBill = {
      id: bill.id,
      invoiceNo: bill.invoice_no,
      invoiceDate: bill.invoice_date,
      totalAmount: bill.total_amount,
      totalGst: bill.total_gst,
      paymentType: bill.payment_type,
      notes: bill.notes,
      createdAt: bill.created_at,
      supplier: bill.supplier,
      items: (bill.items || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        purchasePrice: item.purchase_price,
        mrp: item.mrp,
        gstPercent: item.gst_percent,
        totalAmount: item.total_amount,
        batch: {
          id: item.batch?.id,
          batchNumber: item.batch?.batchNumber,
          expiryDate: item.batch?.expiryDate,
          medicine: {
            id: item.medicine?.id,
            name: item.medicine?.name
          }
        }
      }))
    }

    return NextResponse.json(formattedBill)
  } catch (error: any) {
    console.error('GET /api/purchases/[id] error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch purchase bill' }, { status: 500 })
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

    // 1. Fetch items to revert stock
    const { data: items } = await supabase
      .from('purchase_items')
      .select('medicine_id, batch_id, quantity')
      .eq('bill_id', id)
      .eq('tenant_id', tenantId)

    if (items) {
      for (const item of items) {
        // Revert batch quantity (Using PascalCase Batch)
        const { data: batch } = await supabase.from('Batch').select('quantity').eq('id', item.batch_id).eq('tenantId', tenantId).single()
        if (batch) {
          await supabase.from('Batch').update({ quantity: Math.max(0, (batch.quantity || 0) - item.quantity), updatedAt: new Date().toISOString() }).eq('id', item.batch_id)
        }
      }
    }

    // 2. Delete the bill (CASCADE should handle purchase_items if set up, otherwise we delete them manually)
    // For safety, we match tenant_id
    const { error } = await supabase
      .from('purchase_bills')
      .delete()
      .match({ id, tenant_id: tenantId })

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Purchase bill deleted successfully' })
  } catch (error: any) {
    console.error('DELETE /api/purchases/[id] error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete purchase bill' }, { status: 500 })
  }
}
