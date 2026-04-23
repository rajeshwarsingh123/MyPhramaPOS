import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get stock distribution by unit type
    const medicines = await db.medicine.findMany({
      where: { isActive: true },
      select: {
        unitType: true,
        batches: {
          where: { isActive: true },
          select: { quantity: true },
        },
      },
    })

    // Aggregate stock by unit type
    const stockByType: Record<string, { count: number; stock: number }> = {}
    for (const med of medicines) {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0)
      if (!stockByType[med.unitType]) {
        stockByType[med.unitType] = { count: 0, stock: 0 }
      }
      stockByType[med.unitType].count += 1
      stockByType[med.unitType].stock += totalStock
    }

    // Build chart data
    const colors: Record<string, string> = {
      tablet: '#10b981',
      capsule: '#3b82f6',
      syrup: '#f59e0b',
      injection: '#ef4444',
      cream: '#8b5cf6',
      drops: '#06b6d4',
      inhaler: '#f97316',
      powder: '#ec4899',
    }

    const distribution = Object.entries(stockByType).map(([type, data]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: data.stock,
      medicineCount: data.count,
      fill: colors[type] ?? '#6b7280',
    }))

    // Sort by stock descending
    distribution.sort((a, b) => b.value - a.value)

    return NextResponse.json({ data: distribution })
  } catch (error) {
    console.error('Stock distribution error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock distribution' },
      { status: 500 }
    )
  }
}
