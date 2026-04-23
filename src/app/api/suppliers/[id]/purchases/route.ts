import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supplier = await db.supplier.findUnique({
      where: { id },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const [purchases, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where: { supplierId: id },
        include: {
          items: {
            include: {
              batch: {
                include: { medicine: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.purchaseOrder.count({ where: { supplierId: id } }),
    ])

    // Aggregate totals
    const aggregated = await db.purchaseOrder.aggregate({
      where: { supplierId: id },
      _sum: { totalAmount: true, totalGst: true },
    })

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        gstNumber: supplier.gstNumber,
      },
      purchases: purchases.map((po) => ({
        id: po.id,
        invoiceNo: po.invoiceNo,
        invoiceDate: po.invoiceDate,
        totalAmount: po.totalAmount,
        totalGst: po.totalGst,
        notes: po.notes,
        itemCount: po.items.length,
        medicines: po.items.map((i) => i.batch.medicine.name),
      })),
      total,
      page,
      limit,
      summary: {
        totalSpent: aggregated._sum.totalAmount || 0,
        totalGst: aggregated._sum.totalGst || 0,
        orderCount: total,
      },
    })
  } catch (error) {
    console.error('GET /api/suppliers/[id]/purchases error:', error)
    return NextResponse.json({ error: 'Failed to fetch supplier purchases' }, { status: 500 })
  }
}
