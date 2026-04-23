import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    // Fetch all active batches with stock > 0 and their medicine info
    const batches = await db.batch.findMany({
      where: {
        isActive: true,
        quantity: { gt: 0 },
      },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            genericName: true,
            composition: true,
            companyName: true,
            unitType: true,
            strength: true,
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
    })

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
        status: 'expired',
        label: 'Expired',
        severity: 'critical',
        colorClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-50 dark:bg-red-950/30',
        borderClass: 'border-red-200 dark:border-red-900/50',
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
        totalBatches: 0,
        totalQuantity: 0,
        totalValue: 0,
        batches: [],
      },
      expiring_in_7_days: {
        status: 'expiring_in_7_days',
        label: 'Expiring in 7 Days',
        severity: 'critical',
        colorClass: 'text-red-500 dark:text-red-400',
        bgClass: 'bg-red-50 dark:bg-red-950/30',
        borderClass: 'border-red-200 dark:border-red-900/50',
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
        totalBatches: 0,
        totalQuantity: 0,
        totalValue: 0,
        batches: [],
      },
      expiring_in_30_days: {
        status: 'expiring_in_30_days',
        label: 'Expiring in 30 Days',
        severity: 'warning',
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-50 dark:bg-amber-950/30',
        borderClass: 'border-amber-200 dark:border-amber-900/50',
        badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
        totalBatches: 0,
        totalQuantity: 0,
        totalValue: 0,
        batches: [],
      },
      expiring_in_90_days: {
        status: 'expiring_in_90_days',
        label: 'Expiring in 90 Days',
        severity: 'info',
        colorClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-50 dark:bg-orange-950/30',
        borderClass: 'border-orange-200 dark:border-orange-900/50',
        badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
        totalBatches: 0,
        totalQuantity: 0,
        totalValue: 0,
        batches: [],
      },
      safe: {
        status: 'safe',
        label: 'Safe (>90 Days)',
        severity: 'safe',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderClass: 'border-emerald-200 dark:border-emerald-900/50',
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
        totalBatches: 0,
        totalQuantity: 0,
        totalValue: 0,
        batches: [],
      },
    }

    for (const batch of batches) {
      const daysUntilExpiry = Math.ceil(
        (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      let groupKey: string
      if (daysUntilExpiry < 0) groupKey = 'expired'
      else if (daysUntilExpiry <= 7) groupKey = 'expiring_in_7_days'
      else if (daysUntilExpiry <= 30) groupKey = 'expiring_in_30_days'
      else if (daysUntilExpiry <= 90) groupKey = 'expiring_in_90_days'
      else groupKey = 'safe'

      const group = groups[groupKey]
      const valueAtRisk = batch.quantity * batch.mrp
      group.totalBatches++
      group.totalQuantity += batch.quantity
      group.totalValue += valueAtRisk

      group.batches.push({
        id: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate.toISOString(),
        mfgDate: batch.mfgDate?.toISOString() || null,
        purchasePrice: batch.purchasePrice,
        mrp: batch.mrp,
        quantity: batch.quantity,
        initialQuantity: batch.initialQuantity,
        daysUntilExpiry,
        valueAtRisk,
        medicine: {
          id: batch.medicine.id,
          name: batch.medicine.name,
          genericName: batch.medicine.genericName,
          composition: batch.medicine.composition,
          companyName: batch.medicine.companyName,
          unitType: batch.medicine.unitType,
          strength: batch.medicine.strength,
        },
      })
    }

    // Summary counts
    const totalBatches = batches.length
    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0)
    const totalValueAtRisk = batches.reduce((sum, b) => sum + b.quantity * b.mrp, 0)

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
    return NextResponse.json(
      { error: 'Failed to fetch expiry report' },
      { status: 500 }
    )
  }
}
