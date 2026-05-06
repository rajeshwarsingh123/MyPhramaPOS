import { supabase } from '@/lib/supabase/server'
import { startOfDay, endOfDay } from 'date-fns'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create store setting
    let { data: setting, error: fetchError } = await supabase
      .from('StoreSetting')
      .select('*')
      .eq('tenantId', tenantId)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!setting) {
      const { data: newSetting, error: createError } = await supabase
        .from('StoreSetting')
        .insert({
          tenantId,
          storeName: 'My Pharmacy',
          dailySalesTarget: 10000,
        })
        .select()
        .single()
      
      if (createError) throw createError
      setting = newSetting
    }

    const target = setting.dailySalesTarget ?? 10000

    // Calculate today's actual sales
    const todayStart = startOfDay(new Date()).toISOString()
    const todayEnd = endOfDay(new Date()).toISOString()

    const { data: sales, error: salesError } = await supabase
      .from('Sale')
      .select('totalAmount')
      .eq('tenantId', tenantId)
      .gte('saleDate', todayStart)
      .lte('saleDate', todayEnd)

    if (salesError) throw salesError

    const actual = (sales || []).reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0)
    const percentage = target > 0 ? Math.min((actual / target) * 100, 999) : 0
    const remaining = Math.max(target - actual, 0)

    return NextResponse.json({
      target,
      actual,
      percentage: Math.round(percentage * 100) / 100,
      remaining,
    })
  } catch (error) {
    console.error('Failed to fetch sales target:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales target' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { target } = body

    if (typeof target !== 'number' || target <= 0) {
      return NextResponse.json(
        { error: 'Target must be a positive number' },
        { status: 400 }
      )
    }

    // Upsert store setting
    const { data: setting, error: upsertError } = await supabase
      .from('StoreSetting')
      .upsert({
        tenantId,
        dailySalesTarget: target,
        updatedAt: new Date().toISOString()
      }, { onConflict: 'tenantId' })
      .select()
      .single()

    if (upsertError) throw upsertError

    return NextResponse.json({
      target: setting.dailySalesTarget,
      message: 'Daily sales target updated successfully',
    })
  } catch (error) {
    console.error('Failed to update sales target:', error)
    return NextResponse.json(
      { error: 'Failed to update sales target' },
      { status: 500 }
    )
  }
}
