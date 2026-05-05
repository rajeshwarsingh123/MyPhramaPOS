import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: bill, error } = await supabase
      .from('purchase_bills')
      .select('*, supplier:suppliers(*), items:purchase_items(*, medicine:medicines(*), batch:batches(*))')
      .eq('id', id)
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
          id: item.batch.id,
          batchNumber: item.batch.batch_number,
          expiryDate: item.batch.expiry_date,
          medicine: {
            id: item.medicine.id,
            name: item.medicine.name
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
        // Revert batch quantity
        const { data: batch } = await supabase.from('batches').select('quantity').eq('id', item.batch_id).eq('tenant_id', tenantId).single()
        if (batch) {
          await supabase.from('batches').update({ quantity: Math.max(0, batch.quantity - item.quantity) }).eq('id', item.batch_id)
        }
        
        // Revert medicine total stock
        const { data: med } = await supabase.from('medicines').select('total_stock').eq('id', item.medicine_id).eq('tenant_id', tenantId).single()
        if (med) {
          await supabase.from('medicines').update({ total_stock: Math.max(0, med.total_stock - item.quantity) }).eq('id', item.medicine_id)
        }
      }
    }

    // 2. Delete the bill (CASCADE will handle purchase_items)
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
