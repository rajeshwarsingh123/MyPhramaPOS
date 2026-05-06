import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const medicineId = searchParams.get('medicineId')
    const search = searchParams.get('search') || ''
    const expiryFilter = searchParams.get('expiryFilter') || 'all'

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()
    const ninetyDaysFromNow = new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from('Batch')
      .select('*, medicine:Medicine(id, name, composition, unitType, strength)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)

    if (medicineId) {
      query = query.eq('medicineId', medicineId)
    }

    // Search by batch number or medicine name
    if (search) {
      // Supabase or logic across relations is tricky, so we'll filter in JS if search is present 
      // OR we search only batchNumber via query and medicine via join.
      // For simplicity, we search only batchNumber in query and medicine in JS if needed.
      query = query.ilike('batchNumber', `%${search}%`)
    }

    // Expiry filter
    if (expiryFilter === 'expired') {
      query = query.lt('expiryDate', now)
    } else if (expiryFilter === 'expiring_soon') {
      query = query.gte('expiryDate', now).lte('expiryDate', ninetyDaysFromNow)
    }

    const { data: batches, error } = await query.order('expiryDate', { ascending: true })

    if (error) throw error

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('GET /api/batches error:', error)
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 })
  }
}
