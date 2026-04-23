import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { saleId, items, reason } = body

    if (!saleId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Sale ID and at least one item are required' },
        { status: 400 }
      )
    }

    // Fetch original sale with items
    const originalSale = await db.sale.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { batch: true, medicine: true } },
        customer: true,
      },
    })

    if (!originalSale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    // Validate returned quantities against original sale items
    const originalItemMap = new Map(originalSale.items.map((i) => [i.id, i]))

    for (const returnItem of items) {
      const saleItemId = returnItem.saleItemId as string
      const returnQty = returnItem.quantity as number

      if (!saleItemId || !returnQty || returnQty <= 0) {
        return NextResponse.json(
          { error: 'Each return item must have a valid saleItemId and quantity' },
          { status: 400 }
        )
      }

      const originalItem = originalItemMap.get(saleItemId)
      if (!originalItem) {
        return NextResponse.json(
          { error: `Sale item ${saleItemId} not found in original sale` },
          { status: 400 }
        )
      }

      if (returnQty > originalItem.quantity) {
        return NextResponse.json(
          {
            error: `Cannot return more than ${originalItem.quantity} units of ${originalItem.medicineName}`,
          },
          { status: 400 }
        )
      }
    }

    // Generate return invoice number
    const today = new Date()
    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0')

    const storeSetting = await db.storeSetting.findFirst()
    let returnInvoiceNo: string

    if (storeSetting) {
      const prefix = storeSetting.invoicePrefix || 'INV'
      const seq = storeSetting.nextInvoiceNo
      returnInvoiceNo = `${prefix}-RET-${dateStr}-${String(seq).padStart(3, '0')}`
      await db.storeSetting.update({
        where: { id: storeSetting.id },
        data: { nextInvoiceNo: seq + 1 },
      })
    } else {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const salesCount = await db.sale.count({
        where: { saleDate: { gte: startOfDay } },
      })
      returnInvoiceNo = `INV-RET-${dateStr}-${String(salesCount + 1).padStart(3, '0')}`
    }

    // Calculate return totals
    let totalReturnAmount = 0
    const returnItemsData: Array<{
      batchId: string
      medicineId: string
      medicineName: string
      quantity: number
      mrp: number
      discount: number
      gstPercent: number
      gstAmount: number
      totalAmount: number
    }> = []

    for (const returnItem of items) {
      const saleItemId = returnItem.saleItemId as string
      const returnQty = returnItem.quantity as number
      const originalItem = originalItemMap.get(saleItemId)!

      const mrp = originalItem.mrp
      const lineSubtotal = mrp * returnQty
      const lineDiscount = lineSubtotal * (originalItem.discount / 100)
      const lineTotal = lineSubtotal - lineDiscount
      const gstAmount = originalItem.gstAmount * (returnQty / originalItem.quantity)

      totalReturnAmount += lineTotal

      returnItemsData.push({
        batchId: originalItem.batchId,
        medicineId: originalItem.medicineId,
        medicineName: originalItem.medicineName,
        quantity: returnQty,
        mrp,
        discount: originalItem.discount,
        gstPercent: originalItem.gstPercent,
        gstAmount: Math.round(gstAmount * 100) / 100,
        totalAmount: Math.round(lineTotal * 100) / 100,
      })
    }

    const totalDiscount = returnItemsData.reduce(
      (sum, i) => sum + (i.mrp * i.quantity * i.discount) / 100,
      0
    )
    const totalGst = returnItemsData.reduce((sum, i) => sum + i.gstAmount, 0)

    // Create return sale and restore batch stock in a transaction
    const returnSale = await db.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          customerId: originalSale.customerId,
          doctorName: originalSale.doctorName,
          invoiceNo: returnInvoiceNo,
          subtotal: Math.round(
            returnItemsData.reduce((s, i) => s + i.mrp * i.quantity, 0) * 100
          ) / 100,
          totalGst: Math.round(totalGst * 100) / 100,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          totalAmount: Math.round(totalReturnAmount * 100) / 100,
          paymentMode: originalSale.paymentMode,
          notes: `RETURN from ${originalSale.invoiceNo}${reason ? `. Reason: ${reason}` : ''}`,
          items: {
            create: returnItemsData,
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

      // Restore stock to batches
      for (const returnItem of items) {
        const saleItemId = returnItem.saleItemId as string
        const returnQty = returnItem.quantity as number
        const originalItem = originalItemMap.get(saleItemId)!

        await tx.batch.update({
          where: { id: originalItem.batchId },
          data: { quantity: { increment: returnQty } },
        })
      }

      return newSale
    })

    return NextResponse.json(returnSale)
  } catch (error) {
    console.error('POST /api/billing/return error:', error)
    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 })
  }
}
