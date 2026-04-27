import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const tenant = await db.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const newStatus = tenant.status === 'suspended' ? 'active' : 'suspended'

    const updated = await db.tenant.update({
      where: { id },
      data: { status: newStatus },
    })

    // Log the action
    await db.systemLog.create({
      data: {
        tenantId: id,
        action: `Tenant ${newStatus === 'suspended' ? 'suspended' : 'activated'}`,
        details: `Admin ${newStatus === 'suspended' ? 'suspended' : 'activated'} tenant: ${tenant.businessName}`,
      },
    })

    return NextResponse.json({
      message: `Tenant ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`,
      tenant: updated,
    })
  } catch (error) {
    console.error('POST /api/admin/tenants/[id]/suspend error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle tenant status' },
      { status: 500 },
    )
  }
}
