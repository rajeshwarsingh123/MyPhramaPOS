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

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,gst_number.ilike.%${search}%`)
    }

    const { data: suppliers, count, error } = await query
      .order('name', { ascending: true })
      .range(skip, skip + limit - 1)

    if (error) throw error

    // Fetch stats for each supplier (Total Bills, Total Amount, Last Bill Date)
    // In a real app, this could be a view or a join.
    const suppliersWithStats = await Promise.all(
      (suppliers || []).map(async (supplier) => {
        const { data: bills, error: billsErr } = await supabase
          .from('purchase_bills')
          .select('total_amount, invoice_date')
          .eq('supplier_id', supplier.id)
          .eq('tenant_id', tenantId)

        if (billsErr) throw billsErr

        const totalAmount = bills?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0
        const lastBillDate = bills?.length 
          ? bills.reduce((latest, b) => new Date(b.invoice_date) > new Date(latest) ? b.invoice_date : latest, bills[0].invoice_date)
          : null

        return {
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          gstNumber: supplier.gst_number,
          createdAt: supplier.created_at,
          updatedAt: supplier.updated_at,
          totalOrders: bills?.length || 0,
          totalAmount: totalAmount,
          lastOrderDate: lastBillDate,
        }
      })
    )

    return NextResponse.json({
      suppliers: suppliersWithStats,
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('GET /api/suppliers error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, address, gstNumber } = body

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        gst_number: gstNumber?.trim() || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/suppliers error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create supplier' }, { status: 500 })
  }
}
