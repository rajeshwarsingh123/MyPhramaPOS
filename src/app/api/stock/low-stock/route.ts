import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all active medicines with their active batches for this tenant
    const { data: medicines, error } = await supabase
      .from('medicines')
      .select('*, batches(*)')
      .eq('tenant_id', tenantId)
      .eq('isActive', true)

    if (error) throw error

    type LowStockMedicine = {
      id: string
      name: string
      genericName: string | null
      composition: string | null
      companyName: string | null
      strength: string | null
      unitType: string
      sellingPrice: number
      totalStock: number
      batchCount: number
      worstExpiryDays: number | null
      totalValue: number
      batches: Array<{
        id: string
        batchNumber: string
        quantity: number
        mrp: number
        expiryDate: string
      }>
    }

    const lowStockItems: LowStockMedicine[] = []
    const now = new Date()

    for (const med of medicines || []) {
      const activeBatches = (med.batches || []).filter((b: any) => b.isActive)
      if (activeBatches.length === 0) continue

      const totalStock = activeBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)

      if (totalStock >= 10) continue

      let worstExpiryDays: number | null = null
      const totalValue = activeBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0) * (b.mrp || 0), 0)

      for (const batch of activeBatches) {
        if (batch.quantity <= 0) continue
        const expiryDate = new Date(batch.expiry_date)
        const days = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (worstExpiryDays === null || days < worstExpiryDays) {
          worstExpiryDays = days
        }
      }

      lowStockItems.push({
        id: med.id,
        name: med.name,
        genericName: med.generic_name,
        composition: med.composition,
        companyName: med.company_name,
        strength: med.strength,
        unitType: med.unit_type,
        sellingPrice: med.selling_price,
        totalStock,
        batchCount: activeBatches.length,
        worstExpiryDays,
        totalValue,
        batches: activeBatches.map((b: any) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          mrp: b.mrp,
          expiryDate: b.expiry_date,
        })),
      })
    }

    // Sort by total stock ascending (most critical first), then by name
    lowStockItems.sort((a, b) => {
      if (a.totalStock !== b.totalStock) return a.totalStock - b.totalStock
      return a.name.localeCompare(b.name)
    })

    // Summary
    const outOfStock = lowStockItems.filter((m) => m.totalStock === 0).length
    const criticalStock = lowStockItems.filter((m) => m.totalStock > 0 && m.totalStock <= 5).length
    const totalValue = lowStockItems.reduce((sum, m) => sum + m.totalValue, 0)
    const totalQuantity = lowStockItems.reduce((sum, m) => sum + m.totalStock, 0)

    return NextResponse.json({
      summary: {
        totalItems: lowStockItems.length,
        outOfStock,
        criticalStock,
        totalValue,
        totalQuantity,
      },
      items: lowStockItems,
    })
  } catch (error) {
    console.error('Low stock report error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch low stock data' },
      { status: 500 }
    )
  }
}
