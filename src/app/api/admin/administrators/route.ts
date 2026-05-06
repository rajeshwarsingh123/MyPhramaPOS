import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    let query = supabase.from('Admin').select('*').order('createdAt', { ascending: false })

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data: admins, error } = await query

    if (error) throw error

    return NextResponse.json({ admins })
  } catch (error) {
    console.error('GET /api/admin/administrators error:', error)
    return NextResponse.json({ error: 'Failed to fetch administrators' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, role, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Check if exists
    const { data: existing } = await supabase.from('Admin').select('id').eq('email', email).maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'Administrator with this email already exists' }, { status: 400 })
    }

    const { data: newAdmin, error } = await supabase
      .from('Admin')
      .insert({
        email,
        name: name || 'Admin',
        role: role || 'admin',
        password, // Stored as plain text if it doesn't start with supabase:
        isActive: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(newAdmin)
  } catch (error) {
    console.error('POST /api/admin/administrators error:', error)
    return NextResponse.json({ error: 'Failed to create administrator' }, { status: 500 })
  }
}
