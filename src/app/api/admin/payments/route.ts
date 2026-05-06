import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const status = searchParams.get('status') || ''
    const plan = searchParams.get('plan') || ''
    const fromDate = searchParams.get('fromDate') || ''
    const toDate = searchParams.get('toDate') || ''

    let query = supabase
      .from('Subscription')
      .select('*, tenant:Tenant(id, name, email, businessName)', { count: 'exact' })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (plan && plan !== 'all') {
      query = query.eq('plan', plan)
    }

    if (fromDate) {
      query = query.gte('startDate', new Date(fromDate).toISOString())
    }

    if (toDate) {
      query = query.lte('startDate', new Date(toDate).toISOString())
    }

    const { data: payments, count: total, error } = await query
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      payments: (payments || []).map((p: any) => ({
        id: p.id,
        tenantId: p.tenantId,
        tenantName: p.tenant?.businessName || p.tenant?.name || 'Unknown',
        tenantEmail: p.tenant?.email || '',
        plan: p.plan,
        amount: p.amount,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        paymentMode: p.paymentMode,
        createdAt: p.createdAt,
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
    console.error('GET /api/admin/payments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 },
    )
  }
}
