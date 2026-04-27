import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_request: NextRequest) {
  try {
    const settings = await db.platformSetting.findMany({
      orderBy: { key: 'asc' },
    })

    // Convert to key-value map for easier frontend consumption
    const settingsMap = settings.reduce(
      (acc, s) => {
        acc[s.key] = {
          value: s.value,
          description: s.description,
          updatedAt: s.updatedAt,
        }
        return acc
      },
      {} as Record<string, { value: string; description: string | null; updatedAt: Date }>,
    )

    return NextResponse.json({ settings: settingsMap, settingsList: settings })
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
    const { key, value, description } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 },
      )
    }

    // Upsert the setting
    const setting = await db.platformSetting.upsert({
      where: { key },
      update: {
        ...(value !== undefined ? { value: String(value) } : {}),
        ...(description !== undefined ? { description } : {}),
      },
      create: {
        key,
        value: value !== undefined ? String(value) : '',
        description: description || null,
      },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 },
    )
  }
}
