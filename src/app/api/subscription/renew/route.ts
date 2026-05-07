import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'
import { supabase } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req)
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Get current subscription
    const { data: existing, error: fetchError } = await supabase
      .from('Subscription')
      .select('*')
      .eq('tenantId', tenantId)
      .single()

    if (fetchError || !existing) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

    // 2. Calculate new expiry
    const currentExpiry = new Date(existing.expiryDate || existing.endDate)
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date()
    
    const newExpiry = new Date(baseDate)
    newExpiry.setFullYear(newExpiry.getFullYear() + 1)

    // 3. Update subscription
    const { data: updated, error: updateError } = await supabase
      .from('Subscription')
      .update({
        expiryDate: newExpiry.toISOString(),
        status: 'active',
        renewalCount: (existing.renewalCount || 0) + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('tenantId', tenantId)
      .select()
      .single()

    if (updateError) throw updateError

    // 4. Fetch current price for history
    const { data: priceSetting } = await supabase
      .from('PlatformSetting')
      .select('value')
      .eq('key', 'pro_plan_price_yearly')
      .single()
    
    const amount = parseInt(priceSetting?.value || '4999', 10)

    // 5. Record History
    await supabase.from('SubscriptionHistory').insert({
      tenantId,
      startDate: baseDate.toISOString(),
      expiryDate: newExpiry.toISOString(),
      amount,
      paymentMode: 'upi_mock', // Simulated payment
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('POST /api/subscription/renew error:', error)
    return NextResponse.json({ error: 'Failed to renew' }, { status: 500 })
  }
}
