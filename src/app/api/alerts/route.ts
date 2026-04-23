import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Expiring medicines: batches expiring within 30 days with stock > 0
    const expiringBatches = await db.batch.findMany({
      where: {
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: { gte: now, lte: thirtyDaysFromNow },
      },
      include: {
        medicine: {
          select: { id: true, name: true, unitType: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
      take: 20,
    })

    // Expired medicines: batches already expired with stock > 0
    const expiredBatches = await db.batch.findMany({
      where: {
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: { lt: now },
      },
      include: {
        medicine: {
          select: { id: true, name: true, unitType: true },
        },
      },
      orderBy: { expiryDate: 'desc' },
      take: 20,
    })

    // Low stock medicines: total stock across active batches < 10
    const medicinesWithStock = await db.medicine.findMany({
      where: {
        isActive: true,
        batches: {
          some: { isActive: true },
        },
      },
      select: {
        id: true,
        name: true,
        unitType: true,
        batches: {
          where: { isActive: true },
          select: { quantity: true, expiryDate: true },
        },
      },
    })

    const lowStockMedicines = medicinesWithStock
      .map((m) => ({
        id: m.id,
        name: m.name,
        unitType: m.unitType,
        totalStock: m.batches.reduce((sum, b) => sum + b.quantity, 0),
      }))
      .filter((m) => m.totalStock < 10)
      .sort((a, b) => a.totalStock - b.totalStock)

    // Build alerts array
    const alerts: Array<{
      id: string
      type: 'expired' | 'expiring' | 'low_stock'
      title: string
      description: string
      severity: 'critical' | 'warning' | 'info'
      meta?: Record<string, unknown>
    }> = []

    // Expired alerts
    for (const batch of expiredBatches) {
      const daysAgo = Math.floor(
        (now.getTime() - batch.expiryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      alerts.push({
        id: batch.id,
        type: 'expired',
        title: `${batch.medicine.name} has expired`,
        description: `Batch ${batch.batchNumber} expired ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago. ${batch.quantity} units remaining.`,
        severity: 'critical',
        meta: {
          medicineId: batch.medicineId,
          medicineName: batch.medicine.name,
          batchNumber: batch.batchNumber,
          quantity: batch.quantity,
          expiryDate: batch.expiryDate.toISOString(),
          unitType: batch.medicine.unitType,
        },
      })
    }

    // Expiring soon alerts
    for (const batch of expiringBatches) {
      const daysLeft = Math.ceil(
        (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      alerts.push({
        id: batch.id,
        type: 'expiring',
        title: `${batch.medicine.name} expiring soon`,
        description: `Batch ${batch.batchNumber} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. ${batch.quantity} units remaining.`,
        severity: daysLeft <= 7 ? 'warning' : 'info',
        meta: {
          medicineId: batch.medicineId,
          medicineName: batch.medicine.name,
          batchNumber: batch.batchNumber,
          quantity: batch.quantity,
          expiryDate: batch.expiryDate.toISOString(),
          unitType: batch.medicine.unitType,
          daysLeft,
        },
      })
    }

    // Low stock alerts
    for (const med of lowStockMedicines) {
      alerts.push({
        id: `low-stock-${med.id}`,
        type: 'low_stock',
        title: `${med.name} - Low Stock`,
        description: `Only ${med.totalStock} ${med.unitType}${med.totalStock !== 1 ? 's' : ''} remaining in stock.`,
        severity: med.totalStock === 0 ? 'critical' : 'warning',
        meta: {
          medicineId: med.id,
          medicineName: med.name,
          totalStock: med.totalStock,
          unitType: med.unitType,
        },
      })
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({
      alerts,
      summary: {
        expiredCount: expiredBatches.length,
        expiringSoonCount: expiringBatches.length,
        lowStockCount: lowStockMedicines.length,
      },
    })
  } catch (error) {
    console.error('Alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}
