import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

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

    const suppliers = await db.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 100,
    })

    return NextResponse.json({ suppliers })
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
