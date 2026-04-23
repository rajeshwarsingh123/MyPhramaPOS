import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const customer = await db.customer.findUnique({
      where: { id, isActive: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const sales = await db.sale.findMany({
      where: { customerId: id },
      select: {
        id: true,
        invoiceNo: true,
        saleDate: true,
        totalAmount: true,
        paymentMode: true,
        items: {
          select: {
            medicineName: true,
            quantity: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
      take: 50,
    })

    const result = sales.map((sale) => ({
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      saleDate: sale.saleDate.toISOString(),
      totalAmount: sale.totalAmount,
      paymentMode: sale.paymentMode,
      itemCount: sale.items.length,
      items: sale.items,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/customers/[id]/history error:', error)
    return NextResponse.json({ error: 'Failed to fetch purchase history' }, { status: 500 })
  }
}
