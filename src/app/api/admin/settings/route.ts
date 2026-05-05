import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// All supported settings with their default values
const SETTINGS_DEFAULTS: Record<string, string> = {
  // Platform Settings
  platform_name: 'PharmPOS',
  platform_tagline: 'Smart Pharmacy Management',
  support_email: 'support@pharmpos.com',
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
    const settings = await db.platformSetting.findMany({
      orderBy: { key: 'asc' },
    })

    // Convert to key-value map for easier frontend consumption
    const settingsMap: Record<string, string> = {}
    for (const s of settings) {
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

    // Upsert all settings in a transaction
    const updatedSettings = await db.$transaction(
      Object.entries(settings).map(([key, value]) =>
        db.platformSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: {
            key,
            value: String(value),
            description: null,
          },
        }),
      ),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      },
    )

    return NextResponse.json({
      success: true,
      updatedCount: updatedSettings.length,
    })
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 },
    )
  }
}
