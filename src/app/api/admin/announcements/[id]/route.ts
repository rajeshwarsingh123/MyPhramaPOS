import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existing = await db.announcement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 },
      )
    }

    const announcement = await db.announcement.update({
      where: { id },
      data: { isActive: !existing.isActive },
    })

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('PUT /api/admin/announcements/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle announcement' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existing = await db.announcement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 },
      )
    }

    await db.announcement.delete({ where: { id } })

    return NextResponse.json({
      message: 'Announcement deleted successfully',
    })
  } catch (error) {
    console.error('DELETE /api/admin/announcements/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 },
    )
  }
}
