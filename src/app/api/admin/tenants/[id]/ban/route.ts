import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

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

    const { data: tenant, error: fetchError } = await supabase
      .from('Tenant')
      .select('id, businessName')
      .eq('id', id)
      .single()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const newStatus = banned ? 'suspended' : 'active'

    const { error: updateError } = await supabase
      .from('Tenant')
      .update({ status: newStatus })
      .eq('id', id)

    if (updateError) throw updateError

    const logDetails = banned
      ? `Admin banned tenant: ${tenant.businessName}. Reason: ${reason || 'No reason provided'}`
      : `Admin unbanned tenant: ${tenant.businessName}`

    await supabase.from('SystemLog').insert({
      tenantId: id,
      action: banned ? 'Tenant banned' : 'Tenant unbanned',
      details: logDetails,
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
