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
    let settings: any[] = []
    
    try {
      const { data, error } = await supabase
        .from('PlatformSetting')
        .select('*')
        .order('key', { ascending: true })

      if (error) {
        console.warn('PlatformSetting table fetch failed (might not exist):', error.message)
      } else {
        settings = data || []
      }
    } catch (e) {
      console.warn('PlatformSetting fetch error:', e)
    }

    // Convert to key-value map
    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

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

    // 1. Fetch existing settings to get their IDs
    const { data: existingSettings } = await supabase
      .from('PlatformSetting')
      .select('id, key')

    const idMap: Record<string, string> = {}
    existingSettings?.forEach(s => {
      idMap[s.key] = s.id
    })

    // 2. Prepare upsert data with IDs
    const upsertData = Object.entries(settings).map(([key, value]) => {
      const data: any = {
        key,
        value: String(value),
        updatedAt: new Date().toISOString()
      }
      
      // If we have an existing ID, use it. Otherwise, let the DB handle it or provide a new one.
      // Since the DB might not have a default for cuid(), we generate a UUID-like string.
      if (idMap[key]) {
        data.id = idMap[key]
      } else {
        data.id = `ps_${key}_${Math.random().toString(36).substring(2, 9)}`
      }
      
      return data
    })

    const { data: updatedSettings, error } = await supabase
      .from('PlatformSetting')
      .upsert(upsertData, { onConflict: 'key' })
      .select()

    if (error) {
      console.error('Settings upsert error:', error)
      throw error
    }

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
