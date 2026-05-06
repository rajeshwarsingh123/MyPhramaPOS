import { supabase } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { startOfMonth, endOfMonth } from 'date-fns'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const monthStart = startOfMonth(now).toISOString()
    const monthEnd = endOfMonth(now).toISOString()

    const { data: sales, error } = await supabase
      .from('Sale')
      .select('paymentMode, totalAmount')
      .eq('tenantId', tenantId)
      .gte('saleDate', monthStart)
      .lte('saleDate', monthEnd)

    if (error) throw error

    const modes: Record<string, number> = {
      cash: 0,
      card: 0,
      upi: 0,
      credit: 0,
    }

    for (const sale of (sales || [])) {
      const mode = sale.paymentMode?.toLowerCase() || 'cash'
      if (modes.hasOwnProperty(mode)) {
        modes[mode] += (sale.totalAmount || 0)
      }
    }

    const totals = Object.values(modes).reduce((sum, v) => sum + v, 0)

    return NextResponse.json({
      modes,
      totals,
    })
  } catch (error) {
    console.error('Payment modes error:', error)
    return NextResponse.json({ error: 'Failed to fetch payment mode data' }, { status: 500 })
  }
}
