import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const where: Prisma.SupplierWhereInput = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { gstNumber: { contains: search } },
      ]
    }

    const [suppliers, total] = await Promise.all([
      db.supplier.findMany({
        where,
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
          purchaseOrders: {
            orderBy: { invoiceDate: 'desc' },
            take: 1,
            select: {
              invoiceDate: true,
              totalAmount: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.supplier.count({ where }),
    ])

    // Aggregate total orders and total amount per supplier
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (supplier) => {
        const aggregated = await db.purchaseOrder.aggregate({
          where: { supplierId: supplier.id },
          _sum: { totalAmount: true },
          _count: true,
        })

        return {
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          gstNumber: supplier.gstNumber,
          createdAt: supplier.createdAt,
          updatedAt: supplier.updatedAt,
          totalOrders: aggregated._count,
          totalAmount: aggregated._sum.totalAmount || 0,
          lastOrderDate: supplier.purchaseOrders[0]?.invoiceDate || null,
        }
      })
    )

    return NextResponse.json({
      suppliers: suppliersWithStats,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('GET /api/suppliers error:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, address, gstNumber } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 })
    }

    const supplier = await db.supplier.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('POST /api/suppliers error:', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}
