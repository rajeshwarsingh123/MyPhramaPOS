import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { getTenantId, checkSubscription } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit
    const unitType = searchParams.get('unitType') || ''
    const category = searchParams.get('category') || ''

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('Medicine')
      .select('*, batches:Batch(*)', { count: 'exact' })
      .eq('tenantId', tenantId)

    if (search) {
      query = query.or(`name.ilike.%${search}%,composition.ilike.%${search}%,companyName.ilike.%${search}%,genericName.ilike.%${search}%`)
    }

    if (unitType) {
      query = query.eq('unitType', unitType)
    }

    if (category) {
      query = query.ilike('category', `%${category}%`)
    }

    const { data: medicines, count, error } = await query
      .order('name', { ascending: true })
      .range(skip, skip + limit - 1)

    if (error) throw error

    const formattedMedicines = (medicines || []).map((med: any) => {
      const activeBatches = (med.batches || []).filter((b: any) => b.isActive && b.quantity > 0)
      const totalStock = activeBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)
      const earliestExpiry = activeBatches.length > 0
        ? activeBatches.reduce((earliest: string, b: any) =>
            new Date(b.expiryDate) < new Date(earliest) ? b.expiryDate : earliest,
            activeBatches[0].expiryDate
          )
        : null

      return {
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        companyName: med.companyName,
        composition: med.composition,
        strength: med.strength,
        category: med.category,
        unitType: med.unitType,
        gstPercent: med.gstPercent,
        sellingPrice: med.sellingPrice,
        totalStock,
        earliestExpiry,
        batchCount: (med.batches || []).length,
        batches: med.batches || []
      }
    })

    return NextResponse.json({
      medicines: formattedMedicines,
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('GET /api/medicines error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch medicines' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      genericName,
      companyName,
      composition,
      strength,
      category,
      unitType,
      gstPercent,
      sellingPrice,
    } = body

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check subscription
    const subCheck = await checkSubscription(tenantId)
    if (!subCheck.allowed) {
      return NextResponse.json({ error: subCheck.error }, { status: 403 })
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: medicine, error } = await supabase
      .from('Medicine')
      .insert({
        id: crypto.randomUUID(),
        tenantId,
        name: name.trim(),
        genericName: genericName?.trim() || null,
        companyName: companyName?.trim() || null,
        composition: composition?.trim() || null,
        strength: strength?.trim() || null,
        category: category?.trim() || null,
        unitType: unitType || 'tablet',
        gstPercent: gstPercent !== undefined ? parseFloat(gstPercent) : 5,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(medicine, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/medicines error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create medicine' }, { status: 500 })
  }
}
