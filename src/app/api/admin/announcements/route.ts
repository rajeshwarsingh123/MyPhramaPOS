import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_request: NextRequest) {
  try {
    const announcements = await db.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error('GET /api/admin/announcements error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, message, type } = body

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 },
      )
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      )
    }

    const announcement = await db.announcement.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        type: type || 'info',
        isActive: true,
      },
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/announcements error:', error)
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 },
    )
  }
}
