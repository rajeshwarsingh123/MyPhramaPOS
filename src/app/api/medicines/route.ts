import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const unitType = searchParams.get('unitType') || ''
    const compositionKeyword = searchParams.get('compositionKeyword') || ''
    const category = searchParams.get('category') || ''

    const where: Prisma.MedicineWhereInput = {
      isActive: true,
    }

    const conditions: Prisma.MedicineWhereInput[] = []

    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search } },
          { composition: { contains: search } },
          { companyName: { contains: search } },
          { genericName: { contains: search } },
        ],
      })
    }

    if (unitType) {
      conditions.push({ unitType })
    }

    if (compositionKeyword) {
      conditions.push({
        OR: [
          { composition: { contains: compositionKeyword } },
          { genericName: { contains: compositionKeyword } },
          { name: { contains: compositionKeyword } },
        ],
      })
    }

    if (category) {
      conditions.push({
        category: { contains: category, mode: 'insensitive' },
      })
    }

    if (conditions.length > 0) {
      where.AND = conditions
    }

    const [medicines, total] = await Promise.all([
      db.medicine.findMany({
        where,
        include: {
          batches: {
            where: { isActive: true },
            select: {
              id: true,
              batchNumber: true,
              expiryDate: true,
              mfgDate: true,
              purchasePrice: true,
              mrp: true,
              quantity: true,
              initialQuantity: true,
            },
            orderBy: { expiryDate: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.medicine.count({ where }),
    ])

    const formattedMedicines = medicines.map((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0)
      const activeBatches = med.batches.filter((b) => b.quantity > 0)
      const earliestExpiry =
        activeBatches.length > 0
          ? activeBatches.reduce((earliest, b) =>
              b.expiryDate < earliest ? b.expiryDate : earliest,
              activeBatches[0].expiryDate,
            )
          : null

      return {
        ...med,
        totalStock,
        earliestExpiry,
        batchCount: med.batches.length,
      }
    })

    return NextResponse.json({
      medicines: formattedMedicines,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('GET /api/medicines error:', error)
    return NextResponse.json({ error: 'Failed to fetch medicines' }, { status: 500 })
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
      packSize,
      gstPercent,
      sellingPrice,
      marginPercent,
      batch,
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 })
    }

    const medicine = await db.medicine.create({
      data: {
        name: name.trim(),
        genericName: genericName?.trim() || null,
        companyName: companyName?.trim() || null,
        composition: composition?.trim() || null,
        strength: strength?.trim() || null,
        category: category?.trim() || null,
        unitType: unitType || 'tablet',
        packSize: packSize?.trim() || null,
        gstPercent: gstPercent !== undefined ? parseFloat(gstPercent) : 5,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : 0,
        marginPercent: marginPercent !== undefined ? parseFloat(marginPercent) : 0,
        batches: batch
          ? {
              create: {
                batchNumber: batch.batchNumber?.trim() || `BATCH-${Date.now()}`,
                expiryDate: new Date(batch.expiryDate),
                mfgDate: batch.mfgDate ? new Date(batch.mfgDate) : null,
                purchasePrice: parseFloat(batch.purchasePrice) || 0,
                mrp: parseFloat(batch.mrp) || 0,
                quantity: parseInt(batch.quantity) || 0,
                initialQuantity: parseInt(batch.quantity) || 0,
              },
            }
          : undefined,
      },
      include: {
        batches: true,
      },
    })

    const totalStock = medicine.batches.reduce((sum, b) => sum + b.quantity, 0)
    const activeBatches = medicine.batches.filter((b) => b.quantity > 0)
    const earliestExpiry =
      activeBatches.length > 0
        ? activeBatches.reduce((earliest, b) =>
            b.expiryDate < earliest ? b.expiryDate : earliest,
            activeBatches[0].expiryDate,
          )
        : null

    return NextResponse.json(
      {
        ...medicine,
        totalStock,
        earliestExpiry,
        batchCount: medicine.batches.length,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /api/medicines error:', error)
    return NextResponse.json({ error: 'Failed to create medicine' }, { status: 500 })
  }
}
