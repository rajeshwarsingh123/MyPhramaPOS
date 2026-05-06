import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const action = searchParams.get('action') || ''
    const tenantId = searchParams.get('tenantId') || ''
    const level = searchParams.get('level') || ''
    const fromDate = searchParams.get('fromDate') || ''
    const toDate = searchParams.get('toDate') || ''

    let query = supabase
      .from('SystemLog')
      .select('*, tenant:Tenant(id, businessName, name, email)', { count: 'exact' })

    if (action && action !== 'all') {
      if (action === 'login') query = query.ilike('action', '%login%')
      else if (action === 'error') query = query.or('action.ilike.%error%,details.ilike.%error%')
      else if (action === 'warning') query = query.or('action.ilike.%warning%,details.ilike.%warning%')
      else if (action === 'update') query = query.ilike('action', '%update%')
      else if (action === 'create') query = query.ilike('action', '%create%')
      else query = query.ilike('action', `%${action}%`)
    }

    if (tenantId) query = query.eq('tenantId', tenantId)
    if (fromDate) query = query.gte('createdAt', new Date(fromDate).toISOString())
    if (toDate) query = query.lte('createdAt', new Date(toDate + 'T23:59:59').toISOString())

    const skip = (page - 1) * limit
    const { data: logs, count, error } = await query
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1)

    if (error) throw error

    // Determine level for each log
    const enrichedLogs = (logs || []).map((log: any) => {
      const actionLower = log.action.toLowerCase()
      const detailsLower = (log.details || '').toLowerCase()
      let logLevel = 'info'
      if (actionLower.includes('error') || detailsLower.includes('error')) logLevel = 'error'
      else if (actionLower.includes('warning') || detailsLower.includes('warning')) logLevel = 'warning'
      else if (actionLower.includes('login') || actionLower.includes('signup') || actionLower.includes('register')) logLevel = 'login'
      else if (actionLower.includes('create') || actionLower.includes('add')) logLevel = 'create'
      else if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('change')) logLevel = 'update'

      return { ...log, level: logLevel }
    })

    // Summary counts (Simplifying to one call if possible, or keep separate for now)
    const [
      { count: totalAll },
      { count: errorCount },
      { count: warningCount },
      { count: loginCount }
    ] = await Promise.all([
      supabase.from('SystemLog').select('*', { count: 'exact', head: true }),
      supabase.from('SystemLog').select('*', { count: 'exact', head: true }).or('action.ilike.%error%,details.ilike.%error%'),
      supabase.from('SystemLog').select('*', { count: 'exact', head: true }).or('action.ilike.%warning%,details.ilike.%warning%'),
      supabase.from('SystemLog').select('*', { count: 'exact', head: true }).ilike('action', '%login%')
    ])

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      summary: {
        total: totalAll || 0,
        errors: errorCount || 0,
        warnings: warningCount || 0,
        logins: loginCount || 0,
      },
    })
  } catch (error) {
    console.error('GET /api/admin/logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch system logs' }, { status: 500 })
  }
}
