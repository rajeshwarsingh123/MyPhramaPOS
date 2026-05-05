import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { message } = body

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      )
    }

    const existing = await db.supportTicket.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 },
      )
    }

    // Parse existing replies and append new one
    let replies: unknown[] = []
    try {
      replies = JSON.parse(existing.replies)
    } catch {
      replies = []
    }

    replies.push({
      author: 'admin',
      message: message.trim(),
      time: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: new Date().toISOString(),
    })

    const ticket = await db.supportTicket.update({
      where: { id },
      data: {
        replies: JSON.stringify(replies),
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            businessName: true,
            email: true,
          },
        },
      },
    })

    // Log the reply
    await db.systemLog.create({
      data: {
        tenantId: existing.tenantId,
        action: 'ticket_reply',
        details: `Admin replied to ticket "${existing.subject}"`,
      },
    })

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('POST /api/admin/tickets/[id]/reply error:', error)
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 },
    )
  }
}
