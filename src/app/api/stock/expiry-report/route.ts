import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    // Fetch all active batches with stock > 0 and their medicine info
    const { data: batches, error } = await supabase
      .from('Batch')
      .select('*, medicine:Medicine(id, name, genericName, composition, companyName, unitType, strength)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .gt('quantity', 0)
      .order('expiryDate', { ascending: true })

    if (error) throw error

    type ExpiryBatch = {
      id: string
      batchNumber: string
      expiryDate: string
      mfgDate: string | null
      purchasePrice: number
      mrp: number
      quantity: number
      initialQuantity: number
      daysUntilExpiry: number
      valueAtRisk: number
      medicine: {
        id: string
        name: string
        genericName: string | null
        composition: string | null
        companyName: string | null
        unitType: string
        strength: string | null
      }
    }

    type ExpiryGroup = {
      status: string
      label: string
      severity: string
      colorClass: string
      bgClass: string
      borderClass: string
      badgeClass: string
      totalBatches: number
      totalQuantity: number
      totalValue: number
      batches: ExpiryBatch[]
    }

    // Group batches by expiry status
    const groups: Record<string, ExpiryGroup> = {
      expired: {
        status: 'expired', label: 'Expired', severity: 'critical',
        colorClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-50 dark:bg-red-950/30',
        borderClass: 'border-red-200 dark:border-red-900/50',
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
        totalBatches: 0, totalQuantity: 0, totalValue: 0, batches: [],
      },
      expiring_in_7_days: {
        status: 'expiring_in_7_days', label: 'Expiring in 7 Days', severity: 'critical',
        colorClass: 'text-red-500 dark:text-red-400',
        bgClass: 'bg-red-50 dark:bg-red-950/30',
        borderClass: 'border-red-200 dark:border-red-900/50',
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
        totalBatches: 0, totalQuantity: 0, totalValue: 0, batches: [],
      },
      expiring_in_30_days: {
        status: 'expiring_in_30_days', label: 'Expiring in 30 Days', severity: 'warning',
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-50 dark:bg-amber-950/30',
        borderClass: 'border-amber-200 dark:border-amber-900/50',
        badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
        totalBatches: 0, totalQuantity: 0, totalValue: 0, batches: [],
      },
      expiring_in_90_days: {
        status: 'expiring_in_90_days', label: 'Expiring in 90 Days', severity: 'info',
        colorClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-50 dark:bg-orange-950/30',
        borderClass: 'border-orange-200 dark:border-orange-900/50',
        badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
        totalBatches: 0, totalQuantity: 0, totalValue: 0, batches: [],
      },
      safe: {
        status: 'safe', label: 'Safe (>90 Days)', severity: 'safe',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderClass: 'border-emerald-200 dark:border-emerald-900/50',
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
        totalBatches: 0, totalQuantity: 0, totalValue: 0, batches: [],
      },
    }

    for (const batch of (batches || [])) {
      const expiryDate = new Date(batch.expiryDate)
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      let groupKey: string
      if (daysUntilExpiry < 0) groupKey = 'expired'
      else if (daysUntilExpiry <= 7) groupKey = 'expiring_in_7_days'
      else if (daysUntilExpiry <= 30) groupKey = 'expiring_in_30_days'
      else if (daysUntilExpiry <= 90) groupKey = 'expiring_in_90_days'
      else groupKey = 'safe'

      const group = groups[groupKey]
      const valueAtRisk = (batch.quantity || 0) * (batch.mrp || 0)
      group.totalBatches++
      group.totalQuantity += (batch.quantity || 0)
      group.totalValue += valueAtRisk

      group.batches.push({
        id: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        mfgDate: batch.mfgDate,
        purchasePrice: batch.purchasePrice,
        mrp: batch.mrp,
        quantity: batch.quantity,
        initialQuantity: batch.initialQuantity,
        daysUntilExpiry,
        valueAtRisk,
        medicine: batch.medicine as any,
      })
    }

    const totalBatches = (batches || []).length
    const totalQuantity = (batches || []).reduce((sum, b) => sum + (b.quantity || 0), 0)
    const totalValueAtRisk = (batches || []).reduce((sum, b) => sum + (b.quantity || 0) * (b.mrp || 0), 0)

    return NextResponse.json({
      summary: {
        totalBatches,
        totalQuantity,
        totalValue: totalValueAtRisk,
        expiredBatches: groups.expired.totalBatches,
        expiredValue: groups.expired.totalValue,
        expiring7dBatches: groups.expiring_in_7_days.totalBatches,
        expiring7dValue: groups.expiring_in_7_days.totalValue,
        expiring30dBatches: groups.expiring_in_30_days.totalBatches,
        expiring30dValue: groups.expiring_in_30_days.totalValue,
        expiring90dBatches: groups.expiring_in_90_days.totalBatches,
        expiring90dValue: groups.expiring_in_90_days.totalValue,
        safeBatches: groups.safe.totalBatches,
        safeValue: groups.safe.totalValue,
      },
      groups: Object.values(groups),
    })
  } catch (error) {
    console.error('Expiry report error:', error)
    return NextResponse.json({ error: 'Failed to fetch expiry report' }, { status: 500 })
  }
}
