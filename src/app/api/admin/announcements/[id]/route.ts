import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getAdminId } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminId = await getAdminId(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const { data: existing, error: fetchError } = await supabase
      .from('Announcement')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    const { data: announcement, error: updateError } = await supabase
      .from('Announcement')
      .update({ isActive: !existing.isActive, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('PUT /api/admin/announcements/[id] error:', error)
    return NextResponse.json({ error: 'Failed to toggle announcement' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminId = await getAdminId(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const { data: existing, error: fetchError } = await supabase
      .from('Announcement')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('Announcement')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Announcement deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/admin/announcements/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
}
