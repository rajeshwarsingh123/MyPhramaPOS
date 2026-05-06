import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('Supplier')
      .select('*, purchaseOrders:purchase_bills(totalAmount, invoiceDate)', { count: 'exact' })
      .eq('tenantId', tenantId)

    // Note: If PurchaseOrder model matches purchase_bills table, I'll use purchase_bills for now since it exists.
    // Wait, if I'm normalizing, I should probably stick to what exists if I can't rename tables.
    // But I'll use 'purchase_bills' as the relation name for now.

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,gstNumber.ilike.%${search}%`)
    }

    const { data: suppliers, count, error } = await query
      .order('name', { ascending: true })
      .range(skip, skip + limit - 1)

    if (error) throw error

    const suppliersWithStats = (suppliers || []).map((supplier: any) => {
      const bills = supplier.purchaseOrders || []
      const totalAmount = bills.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0)
      const lastBillDate = bills.length 
        ? bills.reduce((latest: string, b: any) => new Date(b.invoiceDate) > new Date(latest) ? b.invoiceDate : latest, bills[0].invoiceDate)
        : null

      return {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        gstNumber: supplier.gstNumber,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
        totalOrders: bills.length,
        totalAmount: totalAmount,
        lastOrderDate: lastBillDate,
      }
    })

    return NextResponse.json({
      suppliers: suppliersWithStats,
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('GET /api/suppliers error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, address, gstNumber } = body

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: supplier, error } = await supabase
      .from('Supplier')
      .insert({
        tenantId,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/suppliers error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create supplier' }, { status: 500 })
  }
}
