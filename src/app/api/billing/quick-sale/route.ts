import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch sales items to aggregate top selling medicines
    // Since Supabase doesn't support groupBy directly, we fetch all sale items and aggregate in JS
    const { data: saleItems, error: itemsError } = await supabase
      .from('SaleItem')
      .select('medicineId, medicineName, quantity')
      .eq('tenantId', tenantId)
    
    if (itemsError) throw itemsError

    const itemMap = new Map<string, { name: string, quantity: number }>()
    for (const item of (saleItems || [])) {
      const existing = itemMap.get(item.medicineId) || { name: item.medicineName, quantity: 0 }
      existing.quantity += (item.quantity || 0)
      itemMap.set(item.medicineId, existing)
    }

    const topSelling = Array.from(itemMap.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 10)

    if (topSelling.length === 0) {
      return NextResponse.json({ medicines: [] })
    }

    const medIds = topSelling.map(([id]) => id)

    // 2. Fetch medicine details and batch info for these IDs
    const { data: medicinesData, error: medError } = await supabase
      .from('Medicine')
      .select('id, name, composition, strength, unitType, batches:Batch(quantity, mrp, isActive)')
      .in('id', medIds)
      .eq('tenantId', tenantId)
      .eq('isActive', true)

    if (medError) throw medError

    const result = medicinesData.map((med: any) => {
      const activeBatches = (med.batches || []).filter((b: any) => b.isActive)
      const totalStock = activeBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)
      const latestBatchWithStock = activeBatches
        .filter((b: any) => b.quantity > 0)
        .sort((a: any, b: any) => (b.mrp || 0) - (a.mrp || 0))[0]

      const salesInfo = itemMap.get(med.id)

      return {
        id: med.id,
        name: med.name,
        composition: med.composition || null,
        strength: med.strength || null,
        unitType: med.unitType,
        mrp: latestBatchWithStock?.mrp || 0,
        totalStock: totalStock,
        quantitySold: salesInfo?.quantity || 0,
      }
    })

    return NextResponse.json({
      medicines: result,
    })
  } catch (error) {
    console.error('GET /api/billing/quick-sale error:', error)
    return NextResponse.json({ error: 'Failed to fetch quick sale medicines' }, { status: 500 })
  }
}
