import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { format, differenceInDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const expiryFilter = searchParams.get('expiryFilter') ?? 'all'
    const lowStockOnly = searchParams.get('lowStock') === 'true'

    const now = new Date()

    // Build where clause for expiry filtering
    let expiryWhere: Record<string, unknown> = { isActive: true }
    if (expiryFilter === 'expired') {
      expiryWhere.expiryDate = { lt: now }
    } else if (expiryFilter === 'expiring_soon') {
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      expiryWhere.expiryDate = { gte: now, lte: thirtyDaysFromNow }
    }

    const batches = await db.batch.findMany({
      where: {
        isActive: true,
        ...expiryWhere,
      },
      include: {
        medicine: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
    })

    // Process and filter
    let results = batches.map((b) => {
      const daysLeft = differenceInDays(new Date(b.expiryDate), now)
      let status = 'Safe'
      if (daysLeft < 0) status = 'Expired'
      else if (daysLeft <= 7) status = 'Critical'
      else if (daysLeft <= 30) status = 'Expiring Soon'
      else if (daysLeft <= 90) status = 'Warning'

      return {
        medicineName: b.medicine.name,
        batchNumber: b.batchNumber,
        quantity: b.quantity,
        purchasePrice: b.purchasePrice.toFixed(2),
        mrp: b.mrp.toFixed(2),
        expiryDate: format(new Date(b.expiryDate), 'yyyy-MM-dd'),
        daysLeft: daysLeft < 0 ? 0 : daysLeft,
        status,
      }
    })

    if (lowStockOnly) {
      results = results.filter((r) => r.quantity < 10)
    }

    // Build CSV
    const header = 'Medicine Name,Batch #,Quantity,Purchase Price,MRP,Expiry Date,Days Left,Status'
    const rows = results.map((r) =>
      [
        `"${r.medicineName}"`,
        r.batchNumber,
        r.quantity,
        r.purchasePrice,
        r.mrp,
        r.expiryDate,
        r.daysLeft,
        r.status,
      ].join(',')
    )

    const csv = [header, ...rows].join('\n')
    const filename = `stock-report-${format(now, 'yyyy-MM-dd')}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Stock CSV export error:', error)
    return NextResponse.json({ error: 'Failed to export stock CSV' }, { status: 500 })
  }
}
