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

    const { action, status, amount, expiryDate } = body

    const updateData: any = {}
    
    if (action === 'extend') {
      const currentExpiry = new Date(existing.expiryDate || existing.endDate)
      const newExpiry = new Date(currentExpiry)
      newExpiry.setFullYear(newExpiry.getFullYear() + 1)
      
      updateData.expiryDate = newExpiry.toISOString()
      updateData.status = 'active'
      updateData.renewalCount = (existing.renewalCount || 0) + 1
      
      // Log history
      await supabase.from('SubscriptionHistory').insert({
        tenantId: existing.tenantId,
        startDate: currentExpiry.toISOString(),
        expiryDate: newExpiry.toISOString(),
        amount: amount || 0,
        paymentMode: 'admin_manual',
      })
    }

    if (status !== undefined) updateData.status = status
    if (expiryDate !== undefined) updateData.expiryDate = new Date(expiryDate).toISOString()
    
    updateData.updatedAt = new Date().toISOString()

    const { data: subscription, error: updateError } = await supabase
      .from('Subscription')
      .update(updateData)
      .eq('id', id)
      .select('*, tenant:Tenant(id, name, businessName, email)')
      .single()

    if (updateError) throw updateError

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('PUT /api/admin/subscriptions/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 },
    )
  }
}
