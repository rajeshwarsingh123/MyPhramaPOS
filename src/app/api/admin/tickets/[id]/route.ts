import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const { data: ticket, error } = await supabase
      .from('SupportTicket')
      .select('*, tenant:Tenant(id, name, businessName, email, phone, plan)')
      .eq('id', id)
      .single()

    if (error || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 },
      )
    }

    // Parse replies from JSON string
    let parsedReplies: any[] = []
    try {
      parsedReplies = typeof ticket.replies === 'string' ? JSON.parse(ticket.replies) : (ticket.replies || [])
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

    const { data: existing, error: fetchError } = await supabase
      .from('SupportTicket')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 },
      )
    }

    const { status, priority, reply } = body

    let updatedRepliesString = existing.replies

    // If adding a reply, append it
    if (reply) {
      try {
        const replies = typeof existing.replies === 'string' ? JSON.parse(existing.replies) : (existing.replies || [])
        replies.push({
          message: reply,
          from: 'admin',
          timestamp: new Date().toISOString(),
        })
        updatedRepliesString = JSON.stringify(replies)
      } catch {
        updatedRepliesString = JSON.stringify([
          {
            message: reply,
            from: 'admin',
            timestamp: new Date().toISOString(),
          },
        ])
      }
    }

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (reply !== undefined) updateData.replies = updatedRepliesString
    updateData.updatedAt = new Date().toISOString()

    const { data: ticket, error: updateError } = await supabase
      .from('SupportTicket')
      .update(updateData)
      .eq('id', id)
      .select('*, tenant:Tenant(id, name, businessName, email)')
      .single()

    if (updateError) throw updateError

    // Log ticket update
    await supabase.from('SystemLog').insert({
      tenantId: existing.tenantId,
      action: `Ticket updated`,
      details: `Ticket "${existing.subject}" updated: ${status ? `status→${status} ` : ''}${reply ? 'reply added' : ''}`,
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
