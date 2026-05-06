import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

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

    const { data: tenant, error: fetchError } = await supabase
      .from('Tenant')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { data: setting } = await supabase
      .from('PlatformSetting')
      .select('value')
      .eq('key', `tenant_limits_${id}`)
      .maybeSingle()

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

    const { data: tenant, error: fetchError } = await supabase
      .from('Tenant')
      .select('businessName')
      .eq('id', id)
      .single()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const limits: TenantLimits = {
      ...(maxMedicines !== undefined ? { maxMedicines: maxMedicines ?? null } : {}),
      ...(maxBillsPerDay !== undefined ? { maxBillsPerDay: maxBillsPerDay ?? null } : {}),
      ...(maxStaffUsers !== undefined ? { maxStaffUsers: maxStaffUsers ?? null } : {}),
      ...(featuresDisabled !== undefined ? { featuresDisabled } : {}),
    }

    const key = `tenant_limits_${id}`
    const value = JSON.stringify(limits)
    const description = `Usage limits for tenant ${tenant.businessName}`

    // Supabase upsert requires 'on_conflict' or relies on unique constraints
    const { error: upsertError } = await supabase
      .from('PlatformSetting')
      .upsert({
        key,
        value,
        description,
        updatedAt: new Date().toISOString()
      }, { onConflict: 'key' })

    if (upsertError) throw upsertError

    await supabase.from('SystemLog').insert({
      tenantId: id,
      action: 'Usage limits updated',
      details: `Admin updated usage limits for tenant: ${tenant.businessName}. Limits: ${JSON.stringify(limits)}`,
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
