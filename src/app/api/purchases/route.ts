import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const where: Prisma.PurchaseOrderWhereInput = {}

    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { supplier: { name: { contains: search } } },
        { notes: { contains: search } },
      ]
    }

    if (fromDate || toDate) {
      where.invoiceDate = {}
      if (fromDate) {
        where.invoiceDate.gte = new Date(fromDate)
      }
      if (toDate) {
        // Include the full end day
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        where.invoiceDate.lte = end
      }
    }

    const [purchases, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true },
          },
          items: {
            include: {
              batch: {
                include: {
                  medicine: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.purchaseOrder.count({ where }),
    ])

    const formattedPurchases = purchases.map((po) => ({
      id: po.id,
      invoiceNo: po.invoiceNo,
      invoiceDate: po.invoiceDate,
      totalAmount: po.totalAmount,
      totalGst: po.totalGst,
      notes: po.notes,
      supplier: po.supplier,
      itemCount: po.items.length,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
    }))

    return NextResponse.json({
      purchases: formattedPurchases,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('GET /api/purchases error:', error)
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId, invoiceNo, invoiceDate, notes, items } = body

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier is required' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }

    // Validate each item
    for (const item of items) {
      if (!item.medicineId) {
        return NextResponse.json({ error: 'Medicine is required for each item' }, { status: 400 })
      }
      if (!item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: 'Valid quantity is required for each item' }, { status: 400 })
      }
      if (!item.expiryDate) {
        return NextResponse.json({ error: 'Expiry date is required for each item' }, { status: 400 })
      }
    }

    let totalAmount = 0
    let totalGst = 0
    const purchaseItemsData: {
      batchId: string
      quantity: number
      purchasePrice: number
      mrp: number
      gstPercent: number
      totalAmount: number
    }[] = []

    // Process each item: create/find batch, calculate totals
    for (const item of items) {
      const gstPercent = item.gstPercent !== undefined ? parseFloat(item.gstPercent) : 5
      const purchasePrice = parseFloat(item.purchasePrice) || 0
      const mrp = parseFloat(item.mrp) || 0
      const quantity = parseInt(item.quantity) || 0

      // Calculate item total (price * qty)
      const itemBaseAmount = purchasePrice * quantity
      const itemGst = (itemBaseAmount * gstPercent) / 100
      const itemTotal = itemBaseAmount + itemGst

      totalAmount += itemTotal
      totalGst += itemGst

      // Find or create the batch
      const batchNumber = item.batchNumber?.trim() || `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const expiryDate = new Date(item.expiryDate)

      // Check if batch already exists for this medicine
      const existingBatch = await db.batch.findFirst({
        where: {
          medicineId: item.medicineId,
          batchNumber: batchNumber,
        },
      })

      let batchId: string

      if (existingBatch) {
        // Update existing batch: add quantity
        const updatedBatch = await db.batch.update({
          where: { id: existingBatch.id },
          data: {
            quantity: existingBatch.quantity + quantity,
            initialQuantity: existingBatch.initialQuantity + quantity,
            purchasePrice: purchasePrice,
            mrp: mrp,
            expiryDate: expiryDate,
            mfgDate: item.mfgDate ? new Date(item.mfgDate) : existingBatch.mfgDate,
            isActive: true,
          },
        })
        batchId = updatedBatch.id
      } else {
        // Create new batch
        const newBatch = await db.batch.create({
          data: {
            medicineId: item.medicineId,
            batchNumber: batchNumber,
            expiryDate: expiryDate,
            mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
            purchasePrice: purchasePrice,
            mrp: mrp,
            quantity: quantity,
            initialQuantity: quantity,
          },
        })
        batchId = newBatch.id
      }

      purchaseItemsData.push({
        batchId,
        quantity,
        purchasePrice,
        mrp,
        gstPercent,
        totalAmount: itemTotal,
      })
    }

    // Round totals
    totalAmount = Math.round(totalAmount * 100) / 100
    totalGst = Math.round(totalGst * 100) / 100

    // Create the purchase order with all items
    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        supplierId,
        invoiceNo: invoiceNo?.trim() || null,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        totalAmount,
        totalGst,
        notes: notes?.trim() || null,
        items: {
          create: purchaseItemsData,
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            batch: {
              include: {
                medicine: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error('POST /api/purchases error:', error)
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
  }
}
