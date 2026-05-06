import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search') || ''
    const expiryFilter = searchParams.get('expiryFilter') || 'all'
    const lowStock = searchParams.get('lowStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const now = new Date()

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query for medicines
    let query = supabase
      .from('medicines')
      .select('*, batches(*)')
      .eq('tenant_id', tenantId)
      .eq('isActive', true)

    if (search) {
      query = query.or(`name.ilike.%${search}%,composition.ilike.%${search}%,generic_name.ilike.%${search}%,company_name.ilike.%${search}%`)
    }

    const { data: medicines, error } = await query.order('name', { ascending: true })

    if (error) throw error

    // Process medicines: compute totals and filter by expiry/stock
    type ProcessedBatch = {
      id: string
      batchNumber: string
      expiryDate: string
      mfgDate: string | null
      purchasePrice: number
      mrp: number
      quantity: number
      initialQuantity: number
      expiryStatus: 'expired' | 'expiring_7d' | 'expiring_30d' | 'expiring_90d' | 'safe'
      daysUntilExpiry: number
      valueAtRisk: number
    }

    type ProcessedMedicine = {
      id: string
      name: string
      genericName: string | null
      companyName: string | null
      composition: string | null
      strength: string | null
      unitType: string
      totalStock: number
      minMrp: number
      maxMrp: number
      totalValue: number
      valueAtRisk: number
      worstExpiryStatus: string
      batchCount: number
      batches: ProcessedBatch[]
    }

    const processed: ProcessedMedicine[] = []

    for (const med of medicines || []) {
      const activeBatches = (med.batches || []).filter((b: any) => b.isActive)
      
      // Skip medicines with no active batches
      if (activeBatches.length === 0) continue

      let totalStock = 0
      let minMrp = Infinity
      let maxMrp = 0
      let totalValue = 0
      let valueAtRisk = 0
      const statusPriority: Record<string, number> = {
        expired: 0,
        expiring_7d: 1,
        expiring_30d: 2,
        expiring_90d: 3,
        safe: 4,
      }
      let worstStatus = 'safe'
      let worstPriority = 4

      const processedBatches: ProcessedBatch[] = []

      for (const batch of activeBatches) {
        const expiryDate = new Date(batch.expiry_date)
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        let expiryStatus: ProcessedBatch['expiryStatus'] = 'safe'
        if (daysUntilExpiry < 0) expiryStatus = 'expired'
        else if (daysUntilExpiry <= 7) expiryStatus = 'expiring_7d'
        else if (daysUntilExpiry <= 30) expiryStatus = 'expiring_30d'
        else if (daysUntilExpiry <= 90) expiryStatus = 'expiring_90d'

        const qty = batch.quantity || 0
        const mrp = batch.mrp || 0
        totalStock += qty
        if (mrp < minMrp) minMrp = mrp
        if (mrp > maxMrp) maxMrp = mrp
        totalValue += qty * mrp

        if ((expiryStatus === 'expired' || expiryStatus === 'expiring_7d' || expiryStatus === 'expiring_30d') && qty > 0) {
          valueAtRisk += qty * mrp
        }

        if (statusPriority[expiryStatus] < worstPriority) {
          worstPriority = statusPriority[expiryStatus]
          worstStatus = expiryStatus
        }

        processedBatches.push({
          id: batch.id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiry_date,
          mfgDate: batch.mfg_date || null,
          purchasePrice: batch.purchase_price || 0,
          mrp: mrp,
          quantity: qty,
          initialQuantity: batch.initialQuantity || qty,
          expiryStatus,
          daysUntilExpiry,
          valueAtRisk: qty * mrp,
        })
      }

      // Apply expiry filter at medicine level
      if (expiryFilter === 'expired' && worstStatus !== 'expired') continue
      if (expiryFilter === 'expiring_soon' && worstStatus === 'safe' && worstStatus !== 'expired') continue
      if (expiryFilter === 'safe' && worstStatus !== 'safe') continue

      // Apply low stock filter
      if (lowStock && totalStock >= 10) continue

      if (minMrp === Infinity) minMrp = 0

      processed.push({
        id: med.id,
        name: med.name,
        genericName: med.generic_name,
        companyName: med.company_name,
        composition: med.composition,
        strength: med.strength,
        unitType: med.unit_type,
        totalStock,
        minMrp,
        maxMrp,
        totalValue,
        valueAtRisk,
        worstExpiryStatus: worstStatus,
        batchCount: activeBatches.length,
        batches: processedBatches,
      })
    }

    // Sort by urgency: expired first, then expiring_7d, etc.
    const sortPriority: Record<string, number> = {
      expired: 0,
      expiring_7d: 1,
      expiring_30d: 2,
      expiring_90d: 3,
      safe: 4,
    }
    processed.sort((a, b) => {
      const pa = sortPriority[a.worstExpiryStatus] ?? 4
      const pb = sortPriority[b.worstExpiryStatus] ?? 4
      if (pa !== pb) return pa - pb
      return b.valueAtRisk - a.valueAtRisk
    })

    // Pagination
    const totalItems = processed.length
    const totalPages = Math.max(1, Math.ceil(totalItems / limit))
    const safePage = Math.max(1, Math.min(page, totalPages))
    const start = (safePage - 1) * limit
    const paginatedItems = processed.slice(start, start + limit)

    // Compute overview stats from all medicines
    const totalMedicines = processed.length
    const totalStockVal = processed.reduce((sum, m) => sum + m.totalStock, 0)
    const totalValueVal = processed.reduce((sum, m) => sum + m.totalValue, 0)
    const expiredItems = processed.filter((m) => m.worstExpiryStatus === 'expired').length
    const expiredValue = processed
      .filter((m) => m.worstExpiryStatus === 'expired')
      .reduce((sum, m) => sum + m.valueAtRisk, 0)
    const expiring30Items = processed.filter(
      (m) => m.worstExpiryStatus === 'expiring_7d' || m.worstExpiryStatus === 'expiring_30d'
    ).length
    const expiring30Value = processed
      .filter((m) => m.worstExpiryStatus === 'expiring_7d' || m.worstExpiryStatus === 'expiring_30d')
      .reduce((sum, m) => sum + m.valueAtRisk, 0)
    const lowStockItems = processed.filter((m) => m.totalStock < 10).length

    return NextResponse.json({
      overview: {
        totalMedicines,
        totalStock: totalStockVal,
        totalValue: totalValueVal,
        expiring30Items,
        expiring30Value,
        expiredItems,
        expiredValue,
        lowStockItems,
      },
      items: paginatedItems,
      pagination: {
        page: safePage,
        limit,
        totalItems,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Stock overview error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    )
  }
}
