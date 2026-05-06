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
    const priority = searchParams.get('priority') || ''
    const search = searchParams.get('search') || ''

    let query = supabase
      .from('SupportTicket')
      .select('*, tenant:Tenant(id, name, businessName, email)', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (search) {
      // Supabase standard .or doesn't support nested relation fields easily.
      // We filter by subject and description. For tenant search, we'd need a more complex query or RPC.
      query = query.or(`subject.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: tickets, count: total, error } = await query
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/tickets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 },
    )
  }
}
