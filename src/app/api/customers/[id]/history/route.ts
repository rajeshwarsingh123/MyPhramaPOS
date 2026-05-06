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

    const { data: customer, error: custError } = await supabase
      .from('Customer')
      .select('id')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .single()

    if (custError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const { data: sales, error: salesError } = await supabase
      .from('Sale')
      .select('id, invoiceNo, saleDate, totalAmount, paymentMode, notes, items:SaleItem(id, medicineName, quantity, mrp, discount, totalAmount)')
      .eq('customerId', id)
      .eq('tenantId', tenantId)
      .order('saleDate', { ascending: false })
      .limit(50)

    if (salesError) throw salesError

    const result = (sales || []).map((sale: any) => ({
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      saleDate: sale.saleDate,
      totalAmount: sale.totalAmount,
      paymentMode: sale.paymentMode,
      notes: sale.notes,
      itemCount: (sale.items || []).length,
      items: sale.items,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/customers/[id]/history error:', error)
    return NextResponse.json({ error: 'Failed to fetch purchase history' }, { status: 500 })
  }
}
