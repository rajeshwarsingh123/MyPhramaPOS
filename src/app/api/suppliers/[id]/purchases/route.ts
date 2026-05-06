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

    const { data: supplier, error: suppError } = await supabase
      .from('Supplier')
      .select('*')
      .eq('id', id)
      .eq('tenantId', tenantId)
      .single()

    if (suppError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const { data: purchases, count, error } = await supabase
      .from('purchase_bills')
      .select('*, items:purchase_items(*, batch:Batch(medicine:Medicine(name)))', { count: 'exact' })
      .eq('supplier_id', id)
      .eq('tenant_id', tenantId)
      .order('invoice_date', { ascending: false })
      .range(skip, skip + limit - 1)

    if (error) throw error

    // Fetch summary stats
    const { data: statsData, error: statsError } = await supabase
      .from('purchase_bills')
      .select('total_amount, total_gst')
      .eq('supplier_id', id)
      .eq('tenant_id', tenantId)

    if (statsError) throw statsError

    const totalSpent = (statsData || []).reduce((sum, b) => sum + (b.total_amount || 0), 0)
    const totalGst = (statsData || []).reduce((sum, b) => sum + (b.total_gst || 0), 0)

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        gstNumber: supplier.gstNumber,
      },
      purchases: (purchases || []).map((po: any) => ({
        id: po.id,
        invoiceNo: po.invoice_no,
        invoiceDate: po.invoice_date,
        totalAmount: po.total_amount,
        totalGst: po.total_gst,
        notes: po.notes,
        itemCount: (po.items || []).length,
        medicines: (po.items || []).map((i: any) => i.batch?.medicine?.name).filter(Boolean),
      })),
      total: count || 0,
      page,
      limit,
      summary: {
        totalSpent,
        totalGst,
        orderCount: count || 0,
      },
    })
  } catch (error) {
    console.error('GET /api/suppliers/[id]/purchases error:', error)
    return NextResponse.json({ error: 'Failed to fetch supplier purchases' }, { status: 500 })
  }
}
