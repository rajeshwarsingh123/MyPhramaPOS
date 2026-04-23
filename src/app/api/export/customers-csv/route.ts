import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function GET() {
  try {
    const customers = await db.customer.findMany({
      where: { isActive: true },
      include: {
        sales: {
          select: {
            totalAmount: true,
            saleDate: true,
          },
          orderBy: { saleDate: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    const rows = customers.map((c) => {
      const totalOrders = c.sales.length
      const totalPurchases = c.sales.reduce((sum, s) => sum + s.totalAmount, 0)
      const lastVisit = c.sales.length > 0 ? c.sales[0].saleDate : null

      return [
        `"${c.name}"`,
        c.phone ?? '',
        c.email ?? '',
        c.doctorName ?? '',
        totalOrders,
        totalPurchases.toFixed(2),
        lastVisit ? format(new Date(lastVisit), 'yyyy-MM-dd') : 'Never',
        format(new Date(c.createdAt), 'yyyy-MM-dd'),
      ].join(',')
    })

    const header = 'Name,Phone,Email,Doctor,Total Orders,Total Purchases,Last Visit,Join Date'
    const csv = [header, ...rows].join('\n')
    const filename = `customers-report-${format(new Date(), 'yyyy-MM-dd')}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Customers CSV export error:', error)
    return NextResponse.json({ error: 'Failed to export customers CSV' }, { status: 500 })
  }
}
