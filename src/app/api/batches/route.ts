import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const medicineId = searchParams.get('medicineId')
    const search = searchParams.get('search') || ''
    const expiryFilter = searchParams.get('expiryFilter') || 'all'

    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    const batchWhere: Prisma.BatchWhereInput = {
      isActive: true,
    }

    if (medicineId) {
      batchWhere.medicineId = medicineId
    }

    // Search by batch number or medicine name
    if (search) {
      batchWhere.OR = [
        { batchNumber: { contains: search } },
        { medicine: { name: { contains: search } } },
        { medicine: { composition: { contains: search } } },
      ]
    }

    // Expiry filter
    if (expiryFilter === 'expired') {
      batchWhere.expiryDate = { lt: now }
    } else if (expiryFilter === 'expiring_soon') {
      batchWhere.expiryDate = { gte: now, lte: ninetyDaysFromNow }
    }

    const batches = await db.batch.findMany({
      where: batchWhere,
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            composition: true,
            unitType: true,
            strength: true,
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('GET /api/batches error:', error)
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 })
  }
}
