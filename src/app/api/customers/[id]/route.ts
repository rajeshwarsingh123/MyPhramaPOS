import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone, email, address, doctorName } = body

    const { data: existing, error: fetchError } = await supabase
      .from('Customer')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (email !== undefined) updateData.email = email?.trim() || null
    if (address !== undefined) updateData.address = address?.trim() || null
    if (doctorName !== undefined) updateData.doctorName = doctorName?.trim() || null

    const { data: customer, error: updateError } = await supabase
      .from('Customer')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(customer)
  } catch (error) {
    console.error('PUT /api/customers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: existing, error: fetchError } = await supabase
      .from('Customer')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Since schema doesn't have isActive, we'll actually delete or just return success if we want to simulate.
    // For now, I'll attempt a delete if the user really wants to remove it.
    const { error: deleteError } = await supabase
      .from('Customer')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/customers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
