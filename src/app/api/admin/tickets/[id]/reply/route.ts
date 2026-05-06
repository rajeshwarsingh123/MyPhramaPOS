import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

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

    // Parse existing replies and append new one
    let replies: any[] = []
    try {
      replies = typeof existing.replies === 'string' ? JSON.parse(existing.replies) : (existing.replies || [])
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

    const { data: ticket, error: updateError } = await supabase
      .from('SupportTicket')
      .update({
        replies: JSON.stringify(replies),
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, tenant:Tenant(id, name, businessName, email)')
      .single()

    if (updateError) throw updateError

    // Log the reply
    await supabase.from('SystemLog').insert({
      tenantId: existing.tenantId,
      action: 'ticket_reply',
      details: `Admin replied to ticket "${existing.subject}"`,
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
