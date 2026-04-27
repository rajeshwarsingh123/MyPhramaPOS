import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search') || ''
    const paymentMode = searchParams.get('paymentMode') || ''
    const fromDate = searchParams.get('fromDate') || ''
    const toDate = searchParams.get('toDate') || ''

    const where: Prisma.SaleWhereInput = {}

    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { customer: { name: { contains: search } } },
      ]
    }

    if (paymentMode && paymentMode !== 'all') {
      where.paymentMode = paymentMode
    }

    if (fromDate) {
      where.saleDate = { ...((where.saleDate as Prisma.DateTimeNullableFilter) || {}), gte: new Date(fromDate) }
    }

    if (toDate) {
      where.saleDate = { ...((where.saleDate as Prisma.DateTimeNullableFilter) || {}), lte: new Date(toDate + 'T23:59:59') }
    }

    const [invoices, total] = await Promise.all([
      db.sale.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { saleDate: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          items: {
            select: {
              id: true,
              medicineName: true,
              quantity: true,
            },
          },
        },
      }),
      db.sale.count({ where }),
    ])

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        customerName: inv.customer?.name || 'Walk-in',
        saleDate: inv.saleDate,
        totalAmount: inv.totalAmount,
        paymentMode: inv.paymentMode,
        itemCount: inv.items.length,
        subtotal: inv.subtotal,
        totalDiscount: inv.totalDiscount,
        totalGst: inv.totalGst,
      })),
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/invoices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 },
    )
  }
}
