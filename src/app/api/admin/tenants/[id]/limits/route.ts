import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface TenantLimits {
  maxMedicines?: number | null
  maxBillsPerDay?: number | null
  maxStaffUsers?: number | null
  featuresDisabled?: string[]
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const tenant = await db.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const setting = await db.platformSetting.findUnique({
      where: { key: `tenant_limits_${id}` },
    })

    let limits: TenantLimits = {}
    if (setting) {
      try {
        limits = JSON.parse(setting.value)
      } catch {
        limits = {}
      }
    }

    return NextResponse.json({
      success: true,
      limits,
    })
  } catch (error) {
    console.error('GET /api/admin/tenants/[id]/limits error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch limits' },
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
    const { maxMedicines, maxBillsPerDay, maxStaffUsers, featuresDisabled } = body

    const tenant = await db.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const limits: TenantLimits = {
      ...(maxMedicines !== undefined ? { maxMedicines: maxMedicines ?? null } : {}),
      ...(maxBillsPerDay !== undefined ? { maxBillsPerDay: maxBillsPerDay ?? null } : {}),
      ...(maxStaffUsers !== undefined ? { maxStaffUsers: maxStaffUsers ?? null } : {}),
      ...(featuresDisabled !== undefined ? { featuresDisabled } : {}),
    }

    await db.platformSetting.upsert({
      where: { key: `tenant_limits_${id}` },
      update: {
        value: JSON.stringify(limits),
        description: `Usage limits for tenant ${tenant.businessName}`,
      },
      create: {
        key: `tenant_limits_${id}`,
        value: JSON.stringify(limits),
        description: `Usage limits for tenant ${tenant.businessName}`,
      },
    })

    await db.systemLog.create({
      data: {
        tenantId: id,
        action: 'Usage limits updated',
        details: `Admin updated usage limits for tenant: ${tenant.businessName}. Limits: ${JSON.stringify(limits)}`,
      },
    })

    return NextResponse.json({
      success: true,
      limits,
    })
  } catch (error) {
    console.error('PUT /api/admin/tenants/[id]/limits error:', error)
    return NextResponse.json(
      { error: 'Failed to update limits' },
      { status: 500 },
    )
  }
}
