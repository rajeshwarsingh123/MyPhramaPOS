import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ── GET: Fetch returns history ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const reason = searchParams.get('reason') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause
    const where: Record<string, unknown> = {}

    if (reason) {
      where.reason = reason
    }

    if (from || to) {
      where.returnDate = {} as Record<string, Date>
      if (from) {
        (where.returnDate as Record<string, Date>).gte = new Date(from)
      }
      if (to) {
        (where.returnDate as Record<string, Date>).lte = new Date(to)
      }
    }

    // If searching by invoice or medicine name, we need to join with sale/saleItem
    const returns = await db.return.findMany({
      where,
      include: {
        sale: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
        saleItem: {
          include: {
            medicine: { select: { name: true } },
          },
        },
      },
      orderBy: { returnDate: 'desc' },
      take: Math.min(limit, 100),
    })

    // Filter by search (invoice no or customer name or medicine name)
    let filtered = returns
    if (search) {
      const q = search.toLowerCase()
      filtered = returns.filter(
        (r) =>
          r.sale.invoiceNo.toLowerCase().includes(q) ||
          r.saleItem.medicineName.toLowerCase().includes(q) ||
          (r.sale.customer?.name && r.sale.customer.name.toLowerCase().includes(q))
      )
    }

    // Calculate totals
    const totalRefund = filtered.reduce((sum, r) => sum + r.refundAmount, 0)
    const totalItemsReturned = filtered.reduce((sum, r) => sum + r.returnQty, 0)

    const result = filtered.map((r) => ({
      id: r.id,
      saleInvoiceNo: r.sale.invoiceNo,
      originalSaleId: r.saleId,
      saleItemId: r.saleItemId,
      medicineName: r.saleItem.medicineName,
      returnQty: r.returnQty,
      reason: r.reason,
      refundAmount: r.refundAmount,
      returnDate: r.returnDate.toISOString(),
      paymentMode: r.sale.paymentMode,
      customerName: r.sale.customer?.name || 'Walk-in',
    }))

    return NextResponse.json({
      returns: result,
      summary: {
        totalReturns: result.length,
        totalRefund: Math.round(totalRefund * 100) / 100,
        totalItemsReturned,
      },
    })
  } catch (error) {
    console.error('GET /api/billing/return error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch returns' },
      { status: 500 }
    )
  }
}

// ── POST: Process a sales return ────────────────────────────────────────

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

    // Fetch original sale with items and existing returns
    const originalSale = await db.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: { batch: true, medicine: true, returns: true },
        },
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
      const itemReason = (returnItem.reason as string) || reason || ''

      if (!saleItemId || !returnQty || returnQty <= 0) {
        return NextResponse.json(
          { error: 'Each return item must have a valid saleItemId and quantity' },
          { status: 400 }
        )
      }

      if (!itemReason) {
        return NextResponse.json(
          { error: 'A return reason is required for each item' },
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

      // Check already returned quantity
      const alreadyReturned = originalItem.returns.reduce(
        (sum, r) => sum + r.returnQty,
        0
      )
      const maxReturnable = originalItem.quantity - alreadyReturned

      if (returnQty > maxReturnable) {
        return NextResponse.json(
          {
            error: `Cannot return more than ${maxReturnable} units of ${originalItem.medicineName} (already returned ${alreadyReturned})`,
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
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      )
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

    const returnRecordsData: Array<{
      saleItemId: string
      returnQty: number
      reason: string
      refundAmount: number
    }> = []

    for (const returnItem of items) {
      const saleItemId = returnItem.saleItemId as string
      const returnQty = returnItem.quantity as number
      const itemReason = (returnItem.reason as string) || reason || ''
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

      returnRecordsData.push({
        saleItemId,
        returnQty,
        reason: itemReason,
        refundAmount: Math.round(lineTotal * 100) / 100,
      })
    }

    const totalDiscount = returnItemsData.reduce(
      (sum, i) => sum + (i.mrp * i.quantity * i.discount) / 100,
      0
    )
    const totalGst = returnItemsData.reduce((sum, i) => sum + i.gstAmount, 0)

    // Create return sale, Return records, and restore batch stock in a transaction
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
          notes: `RETURN from ${originalSale.invoiceNo}`,
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

      // Create Return records for each returned item
      for (const record of returnRecordsData) {
        await tx.return.create({
          data: {
            saleId,
            saleItemId: record.saleItemId,
            returnQty: record.returnQty,
            reason: record.reason,
            refundAmount: record.refundAmount,
          },
        })
      }

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
    return NextResponse.json(
      { error: 'Failed to process return' },
      { status: 500 }
    )
  }
}
