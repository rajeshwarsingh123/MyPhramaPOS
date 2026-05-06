import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const { data: tenant, error } = await supabase
      .from('Tenant')
      .select('*, Subscription(*), SupportTicket(*), SystemLog(*)')
      .eq('id', id)
      .single()

    if (error || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Process counts and limits
    const subscriptions = (tenant.Subscription || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const supportTickets = (tenant.SupportTicket || [])
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
    const systemLogs = (tenant.SystemLog || [])
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)

    const formattedTenant = {
      ...tenant,
      subscriptions,
      supportTickets,
      systemLogs,
      _count: {
        supportTickets: (tenant.SupportTicket || []).length,
        systemLogs: (tenant.SystemLog || []).length,
        subscriptions: (tenant.Subscription || []).length,
      }
    }

    return NextResponse.json(formattedTenant)
  } catch (error) {
    console.error('GET /api/admin/tenants/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
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

    const { data: existing } = await supabase
      .from('Tenant')
      .select('id')
      .eq('id', id)
      .single()
      
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const {
      name,
      email,
      phone,
      businessName,
      businessPhone,
      businessAddress,
      gstNumber,
      plan,
    } = body

    if (email) {
      const { data: duplicate } = await supabase
        .from('Tenant')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .neq('id', id)
        .maybeSingle()
        
      if (duplicate) {
        return NextResponse.json(
          { error: 'A tenant with this email already exists' },
          { status: 409 },
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email.trim().toLowerCase()
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (businessName !== undefined) updateData.businessName = businessName.trim()
    if (businessPhone !== undefined) updateData.businessPhone = businessPhone?.trim() || null
    if (businessAddress !== undefined) updateData.businessAddress = businessAddress?.trim() || null
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber?.trim() || null
    if (plan !== undefined) updateData.plan = plan
    updateData.updatedAt = new Date().toISOString()

    const { data: tenant, error: updateError } = await supabase
      .from('Tenant')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('PUT /api/admin/tenants/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update tenant' },
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

    const { data: existing } = await supabase
      .from('Tenant')
      .select('id')
      .eq('id', id)
      .single()
      
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('Tenant')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Tenant deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/admin/tenants/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 },
    )
  }
}
