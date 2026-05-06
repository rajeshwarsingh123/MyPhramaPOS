import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data: existing, error: fetchError } = await supabase
      .from('Subscription')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 },
      )
    }

    const { plan, status, amount, startDate, endDate, paymentMode } = body

    const updateData: any = {}
    if (plan !== undefined) updateData.plan = plan
    if (status !== undefined) updateData.status = status
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (startDate !== undefined) updateData.startDate = new Date(startDate).toISOString()
    if (endDate !== undefined) updateData.endDate = new Date(endDate).toISOString()
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode
    updateData.updatedAt = new Date().toISOString()

    const { data: subscription, error: updateError } = await supabase
      .from('Subscription')
      .update(updateData)
      .eq('id', id)
      .select('*, tenant:Tenant(id, name, businessName, email)')
      .single()

    if (updateError) throw updateError

    // If plan changed, update tenant plan too
    if (plan !== undefined && plan !== existing.plan) {
      await supabase
        .from('Tenant')
        .update({ plan })
        .eq('id', existing.tenantId)

      await supabase.from('SystemLog').insert({
        tenantId: existing.tenantId,
        action: 'Plan changed',
        details: `Subscription plan changed from ${existing.plan} to ${plan}`,
      })
    }

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('PUT /api/admin/subscriptions/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 },
    )
  }
}
