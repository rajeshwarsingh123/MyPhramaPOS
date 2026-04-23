import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, doctorName, paymentMode, discount, items } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
    }

    // Validate items first - check stock availability
    const batchIds = items.map((item: { batchId: string }) => item.batchId)
    const batches = await db.batch.findMany({
      where: { id: { in: batchIds } },
      include: { medicine: true },
    })

    const batchMap = new Map(batches.map((b) => [b.id, b]))

    for (const item of items) {
      const batch = batchMap.get(item.batchId)
      if (!batch) {
        return NextResponse.json({ error: `Batch not found: ${item.batchId}` }, { status: 400 })
      }
      if (batch.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${batch.medicine.name}. Available: ${batch.quantity}` },
          { status: 400 }
        )
      }
    }

    // Generate invoice number
    const today = new Date()
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0')

    // Try to get from StoreSetting
    let storeSetting = await db.storeSetting.findFirst()
    let invoiceNo: string

    if (storeSetting) {
      const prefix = storeSetting.invoicePrefix || 'INV'
      const seq = storeSetting.nextInvoiceNo
      invoiceNo = `${prefix}-${dateStr}-${String(seq).padStart(3, '0')}`
      await db.storeSetting.update({
        where: { id: storeSetting.id },
        data: { nextInvoiceNo: seq + 1 },
      })
    } else {
      // Fallback: count existing sales today
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const salesCount = await db.sale.count({
        where: { saleDate: { gte: startOfDay } },
      })
      invoiceNo = `INV-${dateStr}-${String(salesCount + 1).padStart(3, '0')}`
    }

    // Calculate totals
    let subtotal = 0
    let totalGst = 0
    let totalDiscount = 0
    const saleItemsData = []

    for (const item of items) {
      const batch = batchMap.get(item.batchId)!
      const medicine = batch.medicine
      const mrp = item.mrp || batch.mrp
      const qty = item.quantity
      const itemDiscount = item.discount || 0

      // MRP is GST inclusive for Indian pharmacy
      const basePrice = mrp * 100 / (100 + medicine.gstPercent)
      const gstAmount = (mrp - basePrice) * qty
      const lineSubtotal = mrp * qty
      const lineDiscount = lineSubtotal * (itemDiscount / 100)
      const lineTotal = lineSubtotal - lineDiscount

      subtotal += lineSubtotal
      totalGst += gstAmount
      totalDiscount += lineDiscount

      saleItemsData.push({
        batchId: item.batchId,
        medicineId: medicine.id,
        medicineName: medicine.name,
        quantity: qty,
        mrp,
        discount: itemDiscount,
        gstPercent: medicine.gstPercent,
        gstAmount: Math.round(gstAmount * 100) / 100,
        totalAmount: Math.round(lineTotal * 100) / 100,
      })
    }

    const totalAmount = subtotal - totalDiscount

    // Create sale with items in a transaction
    const sale = await db.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          customerId: customerId || null,
          doctorName: doctorName || null,
          invoiceNo,
          subtotal: Math.round(subtotal * 100) / 100,
          totalGst: Math.round(totalGst * 100) / 100,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          paymentMode: paymentMode || 'cash',
          items: {
            create: saleItemsData,
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              batch: true,
              medicine: true,
            },
          },
        },
      })

      // Deduct stock from batches
      for (const item of items) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: { quantity: { decrement: item.quantity } },
        })
      }

      return newSale
    })

    return NextResponse.json(sale)
  } catch (error) {
    console.error('Sale completion error:', error)
    return NextResponse.json({ error: 'Failed to complete sale' }, { status: 500 })
  }
}
