import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { differenceInDays } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const notifications: Array<{
      id: string
      type: 'expired' | 'expiring_soon' | 'low_stock'
      title: string
      description: string
      severity: 'critical' | 'warning' | 'info'
      timestamp: string
    }> = []

    // 1. Expired batches (with stock > 0)
    const expiredBatches = await db.batch.findMany({
      where: {
        expiryDate: { lt: now },
        quantity: { gt: 0 },
        isActive: true,
      },
      include: { medicine: { select: { name: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    })

    for (const batch of expiredBatches) {
      const daysExpired = Math.abs(differenceInDays(now, batch.expiryDate))
      notifications.push({
        id: `expired-${batch.id}`,
        type: 'expired',
        title: `${batch.medicine.name} — Expired`,
        description: `Batch ${batch.batchNumber} expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago. ${batch.quantity} units remaining (₹${(batch.quantity * batch.mrp).toLocaleString('en-IN', { maximumFractionDigits: 0 })}).`,
        severity: 'critical',
        timestamp: batch.expiryDate.toISOString(),
      })
    }

    // 2. Expiring within 30 days (with stock > 0)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiringBatches = await db.batch.findMany({
      where: {
        expiryDate: { gte: now, lte: thirtyDaysFromNow },
        quantity: { gt: 0 },
        isActive: true,
      },
      include: { medicine: { select: { name: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    })

    for (const batch of expiringBatches) {
      const daysLeft = differenceInDays(batch.expiryDate, now)
      const severityLevel = daysLeft <= 7 ? 'critical' : 'warning'
      notifications.push({
        id: `expiring-${batch.id}`,
        type: 'expiring_soon',
        title: `${batch.medicine.name} — Expiring Soon`,
        description: `Batch ${batch.batchNumber} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. ${batch.quantity} units at risk.`,
        severity: severityLevel,
        timestamp: batch.expiryDate.toISOString(),
      })
    }

    // 3. Low stock medicines (total stock across batches < 10)
    const lowStockMedicines = await db.medicine.findMany({
      where: { isActive: true },
      include: {
        batches: {
          where: { isActive: true },
          select: { quantity: true },
        },
      },
    })

    const lowStockItems = lowStockMedicines
      .map((med) => ({
        name: med.name,
        totalStock: med.batches.reduce((sum, b) => sum + b.quantity, 0),
      }))
      .filter((item) => item.totalStock < 10)
      .sort((a, b) => a.totalStock - b.totalStock)
      .slice(0, 10)

    for (const item of lowStockItems) {
      const severityLevel = item.totalStock === 0 ? 'critical' : item.totalStock < 5 ? 'warning' : 'info'
      notifications.push({
        id: `lowstock-${item.name}`,
        type: 'low_stock',
        title: `${item.name} — Low Stock`,
        description: item.totalStock === 0
          ? 'Out of stock. Reorder needed immediately.'
          : `Only ${item.totalStock} unit${item.totalStock !== 1 ? 's' : ''} remaining. Consider reordering.`,
        severity: severityLevel,
        timestamp: now.toISOString(),
      })
    }

    // Sort by severity: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    notifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    // Return max 20
    return NextResponse.json({
      notifications: notifications.slice(0, 20),
      total: notifications.length,
      criticalCount: notifications.filter((n) => n.severity === 'critical').length,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ notifications: [], total: 0, criticalCount: 0 }, { status: 500 })
  }
}
