import { supabase } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    // Today's sales total
    const { data: sales, error: salesError } = await supabase
      .from('Sale')
      .select('totalAmount')
      .eq('tenantId', tenantId)
      .gte('saleDate', todayStart)
      .lt('saleDate', todayEnd)

    if (salesError) throw salesError

    const todaySales = (sales || []).reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0)

    // Low stock count (total stock < 10)
    const { data: medicines, error: medError } = await supabase
      .from('Medicine')
      .select('id, batches:Batch(quantity)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)

    if (medError) throw medError

    const lowStockCount = (medicines || []).filter(
      (m: any) => (m.batches || []).reduce((sum: number, b: any) => sum + (b.quantity || 0), 0) < 10
    ).length

    // Expired count
    const { count: expiredCount, error: expError } = await supabase
      .from('Batch')
      .select('*', { count: 'exact', head: true })
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .lt('expiryDate', now.toISOString())
      .gt('quantity', 0)

    if (expError) throw expError

    return NextResponse.json({
      todaySales,
      lowStockCount,
      expiredCount: expiredCount || 0,
    })
  } catch (error) {
    console.error('Quick stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch quick stats' }, { status: 500 })
  }
}
