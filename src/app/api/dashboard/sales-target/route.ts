import { db } from '@/lib/db'
import { startOfDay, endOfDay } from 'date-fns'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/dashboard/sales-target — returns target, actual, percentage, remaining
export async function GET() {
  try {
    // Get or create store setting
    let setting = await db.storeSetting.findFirst()

    if (!setting) {
      setting = await db.storeSetting.create({
        data: {
          storeName: 'My Pharmacy',
          dailySalesTarget: 10000,
        },
      })
    }

    const target = setting.dailySalesTarget ?? 10000

    // Calculate today's actual sales
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    const salesResult = await db.sale.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        saleDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    const actual = salesResult._sum.totalAmount ?? 0
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

// PUT /api/dashboard/sales-target — update daily target
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { target } = body

    if (typeof target !== 'number' || target <= 0) {
      return NextResponse.json(
        { error: 'Target must be a positive number' },
        { status: 400 }
      )
    }

    // Find or create setting, then update
    let setting = await db.storeSetting.findFirst()

    if (!setting) {
      setting = await db.storeSetting.create({
        data: {
          storeName: 'My Pharmacy',
          dailySalesTarget: target,
        },
      })
    } else {
      setting = await db.storeSetting.update({
        where: { id: setting.id },
        data: { dailySalesTarget: target },
      })
    }

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
