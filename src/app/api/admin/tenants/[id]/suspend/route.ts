import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const { data: tenant, error: fetchError } = await supabase
      .from('Tenant')
      .select('status, businessName')
      .eq('id', id)
      .single()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const newStatus = tenant.status === 'suspended' ? 'active' : 'suspended'

    const { data: updated, error: updateError } = await supabase
      .from('Tenant')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log the action
    await supabase.from('SystemLog').insert({
      tenantId: id,
      action: `Tenant ${newStatus === 'suspended' ? 'suspended' : 'activated'}`,
      details: `Admin ${newStatus === 'suspended' ? 'suspended' : 'activated'} tenant: ${tenant.businessName}`,
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
