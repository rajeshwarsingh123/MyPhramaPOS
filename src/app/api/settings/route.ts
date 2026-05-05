import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find settings for this tenant
    let settings = await db.storeSetting.findUnique({
      where: { tenantId }
    })

    if (!settings) {
      // Create default settings if none exist
      settings = await db.storeSetting.create({
        data: {
          tenantId,
          storeName: 'My Pharmacy',
          invoicePrefix: 'INV',
          nextInvoiceNo: 1,
        },
      })
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

    // Upsert settings for this tenant
    const settings = await db.storeSetting.upsert({
      where: { tenantId },
      update: {
        storeName: storeName !== undefined ? storeName.trim() : undefined,
        phone: phone !== undefined ? (phone?.trim() || null) : undefined,
        email: email !== undefined ? (email?.trim() || null) : undefined,
        address: address !== undefined ? (address?.trim() || null) : undefined,
        gstNumber: gstNumber !== undefined ? (gstNumber?.trim() || null) : undefined,
        licenseNo: licenseNo !== undefined ? (licenseNo?.trim() || null) : undefined,
        logoUrl: logoUrl !== undefined ? (logoUrl?.trim() || null) : undefined,
        invoicePrefix: invoicePrefix !== undefined ? invoicePrefix.trim() : undefined,
        nextInvoiceNo: nextInvoiceNo !== undefined ? nextInvoiceNo : undefined,
      },
      create: {
        tenantId,
        storeName: storeName?.trim() || 'My Pharmacy',
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
        licenseNo: licenseNo?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        invoicePrefix: invoicePrefix?.trim() || 'INV',
        nextInvoiceNo: nextInvoiceNo ?? 1,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('PUT /api/settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
