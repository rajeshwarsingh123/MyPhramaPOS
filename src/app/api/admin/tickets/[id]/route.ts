import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            businessName: true,
            email: true,
            phone: true,
            plan: true,
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 },
      )
    }

    // Parse replies from JSON string
    let parsedReplies: unknown[] = []
    try {
      parsedReplies = JSON.parse(ticket.replies)
    } catch {
      parsedReplies = []
    }

    return NextResponse.json({
      ...ticket,
      replies: parsedReplies,
    })
  } catch (error) {
    console.error('GET /api/admin/tickets/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.supportTicket.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 },
      )
    }

    const { status, priority, reply } = body

    let updatedReplies = existing.replies

    // If adding a reply, append it
    if (reply) {
      try {
        const replies = JSON.parse(existing.replies) as unknown[]
        replies.push({
          message: reply,
          from: 'admin',
          timestamp: new Date().toISOString(),
        })
        updatedReplies = JSON.stringify(replies)
      } catch {
        updatedReplies = JSON.stringify([
          {
            message: reply,
            from: 'admin',
            timestamp: new Date().toISOString(),
          },
        ])
      }
    }

    const ticket = await db.supportTicket.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(reply !== undefined ? { replies: updatedReplies } : {}),
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

    // Log ticket update
    await db.systemLog.create({
      data: {
        tenantId: existing.tenantId,
        action: `Ticket updated`,
        details: `Ticket "${existing.subject}" updated: ${status ? `status→${status} ` : ''}${reply ? 'reply added' : ''}`,
      },
    })

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('PUT /api/admin/tickets/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 },
    )
  }
}
