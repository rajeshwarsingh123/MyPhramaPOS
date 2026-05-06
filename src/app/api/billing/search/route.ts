import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch medicines matching the query
    const { data: medicines, error: medError } = await supabase
      .from('Medicine')
      .select('id, name, genericName, companyName, composition, strength, unitType, packSize, gstPercent')
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .or(`name.ilike.%${q}%,genericName.ilike.%${q}%,composition.ilike.%${q}%`)
      .limit(20)

    if (medError) throw medError

    if (!medicines || medicines.length === 0) {
      return NextResponse.json([])
    }

    const medicineIds = medicines.map(m => m.id)

    // Fetch batches with stock for these medicines
    const { data: batches, error: batchError } = await supabase
      .from('Batch')
      .select('id, medicineId, batchNumber, quantity, purchasePrice, mrp, expiryDate')
      .eq('tenantId', tenantId)
      .in('medicineId', medicineIds)
      .eq('isActive', true)
      .gt('quantity', 0)
      .order('expiryDate', { ascending: true })

    if (batchError) throw batchError

    // Group batches by medicine
    const batchMap = new Map<string, any[]>()
    for (const b of (batches || [])) {
      const list = batchMap.get(b.medicineId) ?? []
      list.push(b)
      batchMap.set(b.medicineId, list)
    }

    const available = medicines
      .filter((m) => (batchMap.get(m.id) ?? []).length > 0)
      .map((m) => {
        const medBatches = batchMap.get(m.id)!
        const totalStock = medBatches.reduce((sum, b) => sum + (b.quantity || 0), 0)
        return {
          id: m.id,
          name: m.name,
          genericName: m.genericName,
          companyName: m.companyName,
          composition: m.composition,
          strength: m.strength,
          unitType: m.unitType,
          packSize: m.packSize,
          gstPercent: m.gstPercent,
          category: m.unitType,
          totalStock,
          nearestExpiry: medBatches[0]?.expiryDate,
          batches: medBatches.map((b) => ({
            id: b.id,
            batchNumber: b.batchNumber,
            qty: b.quantity,
            purchasePrice: b.purchasePrice,
            mrp: b.mrp,
            expiryDate: b.expiryDate,
          })),
        }
      })

    return NextResponse.json(available)
  } catch (error) {
    console.error('Billing search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
