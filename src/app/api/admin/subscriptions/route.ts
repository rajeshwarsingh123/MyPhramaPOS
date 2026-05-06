import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10)),
    )
    const status = searchParams.get('status') || ''

    let query = supabase
      .from('Subscription')
      .select('*, tenant:Tenant(id, name, businessName, email, plan, status)', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: subscriptions, count: total, error } = await query
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/subscriptions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 },
    )
  }
}
