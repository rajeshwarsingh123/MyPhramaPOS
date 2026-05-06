import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: medicines, error } = await supabase
      .from('Medicine')
      .select('category')
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .not('category', 'is', null)

    if (error) throw error

    // Group by category in JavaScript
    const categoryMap = new Map<string, number>()
    for (const med of (medicines || [])) {
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
