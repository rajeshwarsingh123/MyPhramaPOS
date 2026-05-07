import { supabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data: settings, error } = await supabase
      .from('PlatformSetting')
      .select('key, value')
      .in('key', ['pro_plan_price_yearly', 'pro_plan_features'])

    if (error) throw error

    const settingsMap: Record<string, string> = {}
    for (const s of settings || []) {
      settingsMap[s.key] = s.value
    }

    return NextResponse.json({
      price: settingsMap.pro_plan_price_yearly || '4999',
      features: JSON.parse(settingsMap.pro_plan_features || '[]'),
    })
  } catch (error) {
    console.error('GET /api/public-settings error:', error)
    // Return defaults on error
    return NextResponse.json({
      price: '4,999',
      features: [
        'Unlimited Billing',
        'Unlimited Medicines',
        'Full GST Reports',
        'Expiry Alerts',
        'Stock Management',
        'Priority Support',
        'Cloud Backup'
      ]
    })
  }
}
