import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // There should be exactly one StoreSetting record
    let settings = await db.storeSetting.findFirst()

    if (!settings) {
      // Create default settings if none exist
      settings = await db.storeSetting.create({
        data: {
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

    // There should be exactly one record — find or create
    let settings = await db.storeSetting.findFirst()

    if (!settings) {
      settings = await db.storeSetting.create({
        data: {
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
    } else {
      settings = await db.storeSetting.update({
        where: { id: settings.id },
        data: {
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
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('PUT /api/settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
