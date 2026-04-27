import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
        },
        supportTickets: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        systemLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            supportTickets: true,
            systemLogs: true,
            subscriptions: true,
          },
        },
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('GET /api/admin/tenants/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.tenant.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const {
      name,
      email,
      phone,
      businessName,
      businessPhone,
      businessAddress,
      gstNumber,
      plan,
    } = body

    if (email) {
      const duplicate = await db.tenant.findFirst({
        where: { email: email.trim().toLowerCase(), id: { not: id } },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'A tenant with this email already exists' },
          { status: 409 },
        )
      }
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(email !== undefined
          ? { email: email.trim().toLowerCase() }
          : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(businessName !== undefined
          ? { businessName: businessName.trim() }
          : {}),
        ...(businessPhone !== undefined
          ? { businessPhone: businessPhone?.trim() || null }
          : {}),
        ...(businessAddress !== undefined
          ? { businessAddress: businessAddress?.trim() || null }
          : {}),
        ...(gstNumber !== undefined
          ? { gstNumber: gstNumber?.trim() || null }
          : {}),
        ...(plan !== undefined ? { plan } : {}),
      },
    })

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('PUT /api/admin/tenants/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existing = await db.tenant.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    await db.tenant.delete({ where: { id } })

    return NextResponse.json({ message: 'Tenant deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/admin/tenants/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 },
    )
  }
}
