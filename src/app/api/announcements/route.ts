import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { data: announcements, error } = await supabase
      .from('Announcement')
      .select('*')
      .eq('isActive', true)
      .order('createdAt', { ascending: false })

    if (error) throw error

    return NextResponse.json({ announcements: announcements || [] })
  } catch (error) {
    console.error('GET /api/announcements error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 },
    )
  }
}
