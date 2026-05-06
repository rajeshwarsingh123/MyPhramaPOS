import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Since Supabase client doesn't support groupBy directly, 
    // we fetch recent sale items and aggregate in JS.
    // Limiting to last 1000 items for performance.
    const { data: saleItems, error } = await supabase
      .from('SaleItem')
      .select('medicineId, medicineName, quantity, totalAmount')
      .eq('tenantId', tenantId)
      .order('id', { ascending: false })
      .limit(1000)

    if (error) throw error

    const aggregated: Record<string, any> = {}

    for (const item of (saleItems || [])) {
      const key = item.medicineId || item.medicineName
      if (!aggregated[key]) {
        aggregated[key] = {
          medicineName: item.medicineName || 'Unknown',
          quantitySold: 0,
          totalRevenue: 0,
        }
      }
      aggregated[key].quantitySold += item.quantity || 0
      aggregated[key].totalRevenue += item.totalAmount || 0
    }

    const result = Object.values(aggregated)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 8)

    return NextResponse.json({ medicines: result })
  } catch (error) {
    console.error('Error fetching top medicines:', error)
    return NextResponse.json({ medicines: [] }, { status: 500 })
  }
}
