import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const whereClause: any = { tenantId, isActive: true }
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const customers = await db.customer.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        doctorName: true,
        createdAt: true,
        sales: {
          where: {},
          select: {
            id: true,
            totalAmount: true,
            saleDate: true,
          },
          orderBy: { saleDate: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Enrich with computed fields
    const enriched = customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      doctorName: c.doctorName,
      createdAt: c.createdAt,
      totalPurchases: c.sales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalOrders: c.sales.length,
      lastVisit: c.sales.length > 0 ? c.sales[0].saleDate : null,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Customer list error:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, address, doctorName } = body

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await db.customer.create({
      data: {
        tenantId,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        doctorName: doctorName?.trim() || null,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Customer create error:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
