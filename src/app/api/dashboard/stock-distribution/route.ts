import { supabase } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get stock distribution by unit type
    const { data: medicines, error } = await supabase
      .from('Medicine')
      .select('unitType, batches:Batch(quantity)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)

    if (error) throw error

    // Aggregate stock by unit type
    const stockByType: Record<string, { count: number; stock: number }> = {}
    for (const med of (medicines || [])) {
      const totalStock = (med.batches || []).reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)
      if (!stockByType[med.unitType]) {
        stockByType[med.unitType] = { count: 0, stock: 0 }
      }
      stockByType[med.unitType].count += 1
      stockByType[med.unitType].stock += totalStock
    }

    // Build chart data
    const colors: Record<string, string> = {
      tablet: '#10b981',
      capsule: '#3b82f6',
      syrup: '#f59e0b',
      injection: '#ef4444',
      cream: '#8b5cf6',
      drops: '#06b6d4',
      inhaler: '#f97316',
      powder: '#ec4899',
    }

    const distribution = Object.entries(stockByType).map(([type, data]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: data.stock,
      medicineCount: data.count,
      fill: colors[type] ?? '#6b7280',
    }))

    // Sort by stock descending
    distribution.sort((a, b) => b.value - a.value)

    return NextResponse.json({ data: distribution })
  } catch (error) {
    console.error('Stock distribution error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock distribution' },
      { status: 500 }
    )
  }
}
