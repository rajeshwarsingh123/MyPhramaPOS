import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Prisma SQLite doesn't support groupBy on nullable fields.
    // Use raw query instead.
    const categories = await db.$queryRaw<
      { category: string | null; count: bigint }[]
    >`
      SELECT category, COUNT(*) as count
      FROM Medicine
      WHERE isActive = 1 AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `)

    const result = categories.map((c) => ({
      name: c.category,
      count: Number(c.count),
    }))

    return NextResponse.json({ categories: result })
  } catch (error) {
    console.error('GET /api/medicines/categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
