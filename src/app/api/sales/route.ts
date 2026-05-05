import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const search = searchParams.get('search') || ''
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const paymentMode = searchParams.get('paymentMode')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '15')
    const skip = (page - 1) * limit

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    // ── Build Query ──
    let query = supabase
      .from('Sale')
      .select('*, customer:Customer(name, phone), items:SaleItem(*, medicine:Medicine(unitType))', { count: 'exact' })
      .eq('tenantId', tenantId)

    if (search) {
      // Supabase doesn't support complex OR with joins easily in one query, 
      // but we can use or() for top-level fields. 
      // For joined customer name, we might need a separate approach or just search invoiceNo/doctorName.
      query = query.or(`invoiceNo.ilike.%${search}%,doctorName.ilike.%${search}%`)
    }

    if (paymentMode && paymentMode !== 'all') {
      query = query.eq('paymentMode', paymentMode)
    }

    // Date range logic
    if (fromDate || toDate) {
      if (fromDate) query = query.gte('saleDate', new Date(fromDate).toISOString())
      if (toDate) query = query.lte('saleDate', new Date(new Date(toDate).setHours(23, 59, 59, 999)).toISOString())
    } else if (year || month) {
      const y = year ? parseInt(year) : new Date().getFullYear()
      const m = month ? parseInt(month) - 1 : null

      const startDate = new Date(y, m || 0, 1)
      const endDate = m !== null 
        ? new Date(y, m + 1, 0, 23, 59, 59, 999) 
        : new Date(y, 12, 0, 23, 59, 59, 999)

      query = query.gte('saleDate', startDate.toISOString()).lte('saleDate', endDate.toISOString())
    }

    const { data: sales, count, error: fetchError } = await query
      .order('saleDate', { ascending: false })
      .range(skip, skip + limit - 1)

    if (fetchError) throw fetchError

    // ── Fetch Summary Stats (Today, Month, Total) ──
    // Note: Standard Supabase client doesn't support aggregate functions directly.
    // For production, an RPC or a view would be better. 
    // Here we'll fetch the relevant totals using separate queries.
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const [
      { data: allSales, error: allErr },
      { data: todaySales, error: todayErr },
      { data: monthSales, error: monthErr }
    ] = await Promise.all([
      supabase.from('Sale').select('totalAmount').eq('tenantId', tenantId),
      supabase.from('Sale').select('totalAmount').eq('tenantId', tenantId).gte('saleDate', today.toISOString()),
      supabase.from('Sale').select('totalAmount').eq('tenantId', tenantId).gte('saleDate', monthStart.toISOString())
    ])

    if (allErr || todayErr || monthErr) throw (allErr || todayErr || monthErr)

    const totalAmount = allSales?.reduce((sum, s) => sum + (s.totalAmount || 0), 0) || 0
    const todayAmount = todaySales?.reduce((sum, s) => sum + (s.totalAmount || 0), 0) || 0
    const monthAmount = monthSales?.reduce((sum, s) => sum + (s.totalAmount || 0), 0) || 0

    return NextResponse.json({
      sales: sales || [],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page,
      summary: {
        totalSales: totalAmount,
        totalInvoices: count || 0,
        todaySales: todayAmount,
        monthSales: monthAmount,
      }
    })
  } catch (error: any) {
    console.error('GET /api/sales error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch sales history' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const tenantId = searchParams.get('tenantId')

    if (!id || !tenantId) {
      return NextResponse.json({ error: 'ID and Tenant ID are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('Sale')
      .delete()
      .match({ id, tenantId })

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Invoice deleted successfully' })
  } catch (error: any) {
    console.error('DELETE /api/sales error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete invoice' }, { status: 500 })
  }
}
