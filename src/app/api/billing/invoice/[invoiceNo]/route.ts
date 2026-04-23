import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceNo: string }> }
) {
  try {
    const { invoiceNo } = await params

    const sale = await db.sale.findUnique({
      where: { invoiceNo },
      include: {
        customer: true,
        items: {
          include: {
            batch: true,
            medicine: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(sale)
  } catch (error) {
    console.error('Invoice fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}
