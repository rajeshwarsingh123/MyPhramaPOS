import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'
import { supabase } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req)
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: sub, error } = await supabase
      .from('Subscription')
      .select('*')
      .eq('tenantId', tenantId)
      .single()

    if (error || !sub) {
      // Create a default subscription if not found (for safety during migration)
      const expiry = new Date()
      expiry.setFullYear(expiry.getFullYear() + 1)
      
      const { data: newSub } = await supabase.from('Subscription').insert({
        tenantId,
        plan: 'yearly',
        status: 'active',
        expiryDate: expiry.toISOString(),
        amount: 0,
      }).select().single()
      
      return NextResponse.json({ ...newSub, daysLeft: 365 })
    }

    const expiry = new Date(sub.expiryDate || sub.endDate)
    const now = new Date()
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      ...sub,
      expiryDate: expiry.toISOString(),
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      status: now > expiry ? 'expired' : sub.status
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
