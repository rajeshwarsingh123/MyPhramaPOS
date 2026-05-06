import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('Customer')
      .select('*, sales:Sale(id, totalAmount, saleDate)')
      .eq('tenantId', tenantId)

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data: customers, error } = await query.order('name', { ascending: true })

    if (error) throw error

    // Enrich with computed fields
    const enriched = (customers || []).map((c: any) => {
      const sales = c.sales || []
      // Sort sales by date desc for lastVisit
      sales.sort((a: any, b: any) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        doctorName: c.doctorName,
        createdAt: c.createdAt,
        totalPurchases: sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0),
        totalOrders: sales.length,
        lastVisit: sales.length > 0 ? sales[0].saleDate : null,
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Customer list error:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, address, doctorName } = body

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: customer, error } = await supabase
      .from('Customer')
      .insert({
        tenantId,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        doctorName: doctorName?.trim() || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Customer create error:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
