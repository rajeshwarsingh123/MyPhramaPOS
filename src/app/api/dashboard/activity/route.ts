import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { differenceInDays } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch recent sales (last 10)
    const recentSales = await db.sale.findMany({
      where: {
        saleDate: { gte: thirtyDaysAgo },
        notes: { not: { startsWith: 'RETURN' } },
      },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { saleDate: 'desc' },
      take: 10,
    })

    // Fetch recent purchases (last 5)
    const recentPurchases = await db.purchaseOrder.findMany({
      where: {
        invoiceDate: { gte: thirtyDaysAgo },
      },
      include: {
        supplier: { select: { name: true } },
      },
      orderBy: { invoiceDate: 'desc' },
      take: 5,
    })

    // Fetch recent returns
    const recentReturns = await db.sale.findMany({
      where: {
        saleDate: { gte: thirtyDaysAgo },
        notes: { startsWith: 'RETURN' },
      },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { saleDate: 'desc' },
      take: 5,
    })

    // Fetch low stock alerts (medicines with total stock < 10)
    const lowStockMedicines = await db.medicine.findMany({
      where: { isActive: true },
      include: {
        batches: {
          where: { isActive: true },
          select: { quantity: true, expiryDate: true },
        },
      },
    })

    const lowStockAlerts = lowStockMedicines
      .map((med) => ({
        id: med.id,
        name: med.name,
        totalStock: med.batches.reduce((sum, b) => sum + b.quantity, 0),
      }))
      .filter((m) => m.totalStock > 0 && m.totalStock < 10)
      .sort((a, b) => a.totalStock - b.totalStock)
      .slice(0, 5)

    // Fetch expiry alerts (active batches expiring within 90 days with stock)
    const expiryAlerts = lowStockMedicines
      .flatMap((med) => {
        const activeBatches = med.batches.filter((b) => b.quantity > 0)
        return activeBatches.map((batch) => ({
          medicineName: med.name,
          daysLeft: differenceInDays(new Date(batch.expiryDate), now),
          quantity: batch.quantity,
        }))
      })
      .filter((a) => a.daysLeft <= 90)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5)

    // Build activity feed
    const activities: Array<{
      id: string
      type: 'sale' | 'purchase' | 'return' | 'low_stock' | 'expiry'
      title: string
      description: string
      timestamp: string
      amount?: number
    }> = []

    // Add sales
    for (const sale of recentSales) {
      activities.push({
        id: sale.id,
        type: 'sale',
        title: 'New Sale',
        description: `${sale.customer?.name || 'Walk-in'} — ${sale.invoiceNo}`,
        timestamp: sale.saleDate.toISOString(),
        amount: sale.totalAmount,
      })
    }

    // Add purchases
    for (const po of recentPurchases) {
      activities.push({
        id: po.id,
        type: 'purchase',
        title: 'New Purchase',
        description: `From ${po.supplier.name} — ${po.invoiceNo || 'No Invoice'}`,
        timestamp: po.invoiceDate.toISOString(),
        amount: po.totalAmount,
      })
    }

    // Add returns
    for (const ret of recentReturns) {
      activities.push({
        id: ret.id,
        type: 'return',
        title: 'Sale Returned',
        description: `${ret.customer?.name || 'Walk-in'} — ${ret.invoiceNo}`,
        timestamp: ret.saleDate.toISOString(),
        amount: ret.totalAmount,
      })
    }

    // Add low stock alerts
    for (const stock of lowStockAlerts) {
      activities.push({
        id: `low-${stock.id}`,
        type: 'low_stock',
        title: 'Low Stock Alert',
        description: `${stock.name} — ${stock.totalStock} units remaining`,
        timestamp: now.toISOString(),
      })
    }

    // Add expiry alerts
    for (const exp of expiryAlerts) {
      const severity =
        exp.daysLeft < 0
          ? 'Expired'
          : exp.daysLeft <= 7
            ? `${exp.daysLeft} days left`
            : `${exp.daysLeft} days left`
      activities.push({
        id: `exp-${exp.medicineName}-${exp.daysLeft}`,
        type: 'expiry',
        title: exp.daysLeft < 0 ? 'Medicine Expired' : 'Expiry Warning',
        description: `${exp.medicineName} — ${severity}`,
        timestamp: now.toISOString(),
      })
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      activities: activities.slice(0, 25),
      summary: {
        salesCount: recentSales.length,
        purchasesCount: recentPurchases.length,
        returnsCount: recentReturns.length,
        lowStockCount: lowStockAlerts.length,
        expiryCount: expiryAlerts.length,
      },
    })
  } catch (error) {
    console.error('GET /api/dashboard/activity error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 })
  }
}
