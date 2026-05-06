import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find settings for this tenant in Supabase 'StoreSetting' table
    let { data: settings, error } = await supabase
      .from('StoreSetting')
      .select('*')
      .eq('tenantId', tenantId)
      .single()

    if (error && error.code === 'PGRST116') { // No record found
      // Create default settings if none exist
      const { data: newSettings, error: createError } = await supabase
        .from('StoreSetting')
        .insert({
          tenantId,
          storeName: 'My Pharmacy',
          invoicePrefix: 'INV',
          nextInvoiceNo: 1,
        })
        .select()
        .single()
        
      if (createError) throw createError
      settings = newSettings
    } else if (error) {
      throw error
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('GET /api/settings error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      storeName,
      phone,
      email,
      address,
      gstNumber,
      licenseNo,
      logoUrl,
      invoicePrefix,
      nextInvoiceNo,
    } = body

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Upsert settings for this tenant (Supabase upsert on tenantId)
    const { data: settings, error } = await supabase
      .from('StoreSetting')
      .upsert({
        tenantId,
        storeName: storeName !== undefined ? storeName.trim() : 'My Pharmacy',
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
        licenseNo: licenseNo?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        invoicePrefix: invoicePrefix?.trim() || 'INV',
        nextInvoiceNo: nextInvoiceNo ?? 1,
        updatedAt: new Date().toISOString()
      }, { onConflict: 'tenantId' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(settings)
  } catch (error) {
    console.error('PUT /api/settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
