import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { banned, reason } = body

    if (typeof banned !== 'boolean') {
      return NextResponse.json(
        { error: 'banned must be a boolean' },
        { status: 400 },
      )
    }

    const tenant = await db.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const newStatus = banned ? 'suspended' : 'active'

    await db.tenant.update({
      where: { id },
      data: { status: newStatus },
    })

    const logDetails = banned
      ? `Admin banned tenant: ${tenant.businessName}. Reason: ${reason || 'No reason provided'}`
      : `Admin unbanned tenant: ${tenant.businessName}`

    await db.systemLog.create({
      data: {
        tenantId: id,
        action: banned ? 'Tenant banned' : 'Tenant unbanned',
        details: logDetails,
      },
    })

    return NextResponse.json({
      success: true,
      status: newStatus,
    })
  } catch (error) {
    console.error('PUT /api/admin/tenants/[id]/ban error:', error)
    return NextResponse.json(
      { error: 'Failed to update ban status' },
      { status: 500 },
    )
  }
}
