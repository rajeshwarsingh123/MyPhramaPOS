import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('Sale')
      .select('*, Customer(name), SaleItem(id)')
      .eq('tenantId', tenantId)

    if (search) {
      // In Supabase, complex OR across relations might be tricky in a single .or() 
      // but we can try to filter by invoiceNo or search for customer name separately if needed.
      // For now, let's stick to invoiceNo search.
      query = query.ilike('invoiceNo', `%${search}%`)
    }

    const { data: invoices, error } = await query
      .order('saleDate', { ascending: false })
      .limit(Math.min(limit, 50))

    if (error) throw error

    const result = (invoices || []).map((inv: any) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      saleDate: inv.saleDate,
      customerName: inv.Customer?.name || 'Walk-in',
      totalAmount: inv.totalAmount,
      paymentMode: inv.paymentMode,
      itemCount: (inv.SaleItem || []).length,
    }))

    return NextResponse.json({ invoices: result })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ invoices: [] }, { status: 500 })
  }
}
