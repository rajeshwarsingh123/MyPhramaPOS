import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search') || ''
    const paymentMode = searchParams.get('paymentMode') || ''
    const fromDate = searchParams.get('fromDate') || ''
    const toDate = searchParams.get('toDate') || ''

    let query = supabase
      .from('Sale')
      .select('*, customer:Customer(id, name, phone), items:SaleItem(id, medicineName, quantity)', { count: 'exact' })

    if (search) {
      // For customer name search, we'd need a more complex query. 
      // For now, we search by invoice number.
      query = query.ilike('invoiceNo', `%${search}%`)
    }

    if (paymentMode && paymentMode !== 'all') {
      query = query.eq('paymentMode', paymentMode)
    }

    if (fromDate) {
      query = query.gte('saleDate', new Date(fromDate).toISOString())
    }

    if (toDate) {
      query = query.lte('saleDate', new Date(toDate + 'T23:59:59').toISOString())
    }

    const { data: invoices, count: total, error } = await query
      .order('saleDate', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      invoices: (invoices || []).map((inv: any) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        customerName: inv.customer?.name || 'Walk-in',
        saleDate: inv.saleDate,
        totalAmount: inv.totalAmount,
        paymentMode: inv.paymentMode,
        itemCount: inv.items.length,
        subtotal: inv.subtotal,
        totalDiscount: inv.totalDiscount,
        totalGst: inv.totalGst,
      })),
      total: total || 0,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/invoices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 },
    )
  }
}
