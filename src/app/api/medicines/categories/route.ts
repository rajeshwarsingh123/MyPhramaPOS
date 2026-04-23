import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Fetch all active medicines with categories (avoid groupBy on nullable fields in SQLite)
    const medicines = await db.medicine.findMany({
      where: {
        isActive: true,
        category: { not: null },
      },
      select: {
        category: true,
      },
    })

    // Group by category in JavaScript
    const categoryMap = new Map<string, number>()
    for (const med of medicines) {
      const cat = med.category!
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
    }

    const result = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ categories: result })
  } catch (error) {
    console.error('GET /api/medicines/categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
