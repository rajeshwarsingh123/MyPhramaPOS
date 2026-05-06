import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { newPassword } = body

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'newPassword is required' },
        { status: 400 },
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 },
      )
    }

    const { data: tenant, error: fetchError } = await supabase
      .from('Tenant')
      .select('businessName, email')
      .eq('id', id)
      .single()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('Tenant')
      .update({ passwordHash: newPassword })
      .eq('id', id)

    if (updateError) throw updateError

    await supabase.from('SystemLog').insert({
      tenantId: id,
      action: 'Password reset by admin',
      details: `Admin reset password for tenant: ${tenant.businessName} (${tenant.email})`,
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('PUT /api/admin/tenants/[id]/reset-password error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 },
    )
  }
}
