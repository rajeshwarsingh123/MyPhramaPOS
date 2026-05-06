import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

// All supported settings with their default values
const SETTINGS_DEFAULTS: Record<string, string> = {
  // Platform Settings
  platform_name: 'PharmPOS',
  platform_tagline: 'Smart Pharmacy Management',
  support_email: 'rajeshwarsinghrana16@gmail.com',
  maintenance_mode: 'false',
  max_free_medicines: '50',
  max_free_bills_per_day: '100',
  max_free_staff: '1',
  default_trial_days: '14',
  ai_scan_enabled: 'true',

  // Email / Notification Settings
  smtp_enabled: 'false',
  notification_new_signup: 'true',
  notification_subscription_expiry: 'true',
  notification_ticket_creation: 'true',

  // Security Settings
  password_min_length: '8',
  two_factor_admins: 'false',
  session_timeout: '30', // minutes
  ip_whitelist: '', // one IP per line

  // Plan Configuration
  free_plan_features: '["billing","inventory","basic_reports","single_user"]',
  pro_plan_price_monthly: '999',
  pro_plan_price_yearly: '9990',
  pro_plan_features: '["billing","inventory","advanced_reports","ai_scan","bulk_import","export_reports","custom_branding","api_access","multi_user","priority_support"]',

  // API Settings
  api_rate_limit: '60',
  api_access_tenants: 'false',
}

export async function GET(_request: NextRequest) {
  try {
    const { data: settings, error } = await supabase
      .from('PlatformSetting')
      .select('*')
      .order('key', { ascending: true })

    if (error) throw error

    // Convert to key-value map for easier frontend consumption
    const settingsMap: Record<string, string> = {}
    for (const s of settings || []) {
      settingsMap[s.key] = s.value
    }

    // Ensure all defaults are present
    for (const [key, defaultValue] of Object.entries(SETTINGS_DEFAULTS)) {
      if (!(key in settingsMap)) {
        settingsMap[key] = defaultValue
      }
    }

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error('GET /api/admin/settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings } = body as { settings: Record<string, string> }

    if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
      return NextResponse.json(
        { error: 'Settings object with at least one key is required' },
        { status: 400 },
      )
    }

    // Validate that all provided keys are known
    const unknownKeys = Object.keys(settings).filter((k) => !(k in SETTINGS_DEFAULTS))
    if (unknownKeys.length > 0) {
      return NextResponse.json(
        { error: `Unknown setting keys: ${unknownKeys.join(', ')}` },
        { status: 400 },
      )
    }

    // Upsert settings one by one (Supabase upsert handles this)
    const upsertData = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updatedAt: new Date().toISOString()
    }))

    const { data: updatedSettings, error } = await supabase
      .from('PlatformSetting')
      .upsert(upsertData, { onConflict: 'key' })
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      updatedCount: updatedSettings?.length || 0,
    })
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 },
    )
  }
}
