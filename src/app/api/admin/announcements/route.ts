import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getAdminId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const adminId = await getAdminId(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: announcements, error } = await supabase
      .from('Announcement')
      .select('*')
      .order('createdAt', { ascending: false })

    if (error) throw error

    return NextResponse.json({ announcements: announcements || [] })
  } catch (error) {
    console.error('GET /api/admin/announcements error:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = await getAdminId(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { title, message, type } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const { data: announcement, error } = await supabase
      .from('Announcement')
      .insert({
        id: crypto.randomUUID(),
        title: title.trim(),
        message: message.trim(),
        type: type || 'info',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/announcements error:', error)
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}
