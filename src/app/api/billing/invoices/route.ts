import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    const where = search
      ? {
          OR: [
            { invoiceNo: { contains: search } },
            { customer: { name: { contains: search } } },
          ],
        }
      : {}

    const invoices = await db.sale.findMany({
      where,
      include: {
        customer: {
          select: { name: true },
        },
        items: {
          select: { id: true },
        },
      },
      orderBy: { saleDate: 'desc' },
      take: Math.min(limit, 50),
    })

    const result = invoices.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      saleDate: inv.saleDate.toISOString(),
      customerName: inv.customer?.name || 'Walk-in',
      totalAmount: inv.totalAmount,
      paymentMode: inv.paymentMode,
      itemCount: inv.items.length,
    }))

    return NextResponse.json({ invoices: result })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ invoices: [] }, { status: 500 })
  }
}
