import { supabase } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: medicines, error } = await supabase
      .from('Medicine')
      .select('id, name, composition, unitType, batches:Batch(quantity)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .order('name', { ascending: true })

    if (error) throw error

    const items = (medicines || [])
      .map((med: any) => {
        const totalStock = (med.batches || []).reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)
        return {
          medicineName: med.name,
          composition: med.composition,
          unitType: med.unitType,
          totalStock,
          batchCount: (med.batches || []).length,
        }
      })
      .filter((m) => m.totalStock < 10)
      .sort((a, b) => a.totalStock - b.totalStock)

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Low stock report error:', error)
    return NextResponse.json({ error: 'Failed to fetch low stock report' }, { status: 500 })
  }
}
