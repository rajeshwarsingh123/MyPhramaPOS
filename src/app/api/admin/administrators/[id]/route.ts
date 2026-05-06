import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { id } = params
    const { email, name, role, password, isActive } = body

    const updateData: any = {}
    if (email) updateData.email = email
    if (name) updateData.name = name
    if (role) updateData.role = role
    if (password) updateData.password = password
    if (isActive !== undefined) updateData.isActive = isActive

    const { data, error } = await supabase
      .from('Admin')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('PUT /api/admin/administrators/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update administrator' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const { error } = await supabase.from('Admin').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/administrators/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete administrator' }, { status: 500 })
  }
}
