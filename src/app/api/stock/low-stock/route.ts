import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Fetch all active medicines with their active batches
    const medicines = await db.medicine.findMany({
      where: {
        isActive: true,
        batches: {
          some: { isActive: true },
        },
      },
      select: {
        id: true,
        name: true,
        genericName: true,
        composition: true,
        companyName: true,
        strength: true,
        unitType: true,
        sellingPrice: true,
        batches: {
          where: { isActive: true },
          select: {
            id: true,
            batchNumber: true,
            quantity: true,
            mrp: true,
            expiryDate: true,
          },
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    type LowStockMedicine = {
      id: string
      name: string
      genericName: string | null
      composition: string | null
      companyName: string | null
      strength: string | null
      unitType: string
      sellingPrice: number
      totalStock: number
      batchCount: number
      worstExpiryDays: number | null
      totalValue: number
      batches: Array<{
        id: string
        batchNumber: string
        quantity: number
        mrp: number
        expiryDate: string
      }>
    }

    const lowStockItems: LowStockMedicine[] = []

    for (const med of medicines) {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0)

      if (totalStock >= 10) continue

      const now = new Date()
      let worstExpiryDays: number | null = null
      const totalValue = med.batches.reduce((sum, b) => sum + b.quantity * b.mrp, 0)

      for (const batch of med.batches) {
        if (batch.quantity <= 0) continue
        const days = Math.ceil(
          (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (worstExpiryDays === null || days < worstExpiryDays) {
          worstExpiryDays = days
        }
      }

      lowStockItems.push({
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        composition: med.composition,
        companyName: med.companyName,
        strength: med.strength,
        unitType: med.unitType,
        sellingPrice: med.sellingPrice,
        totalStock,
        batchCount: med.batches.length,
        worstExpiryDays,
        totalValue,
        batches: med.batches.map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          mrp: b.mrp,
          expiryDate: b.expiryDate.toISOString(),
        })),
      })
    }

    // Sort by total stock ascending (most critical first), then by name
    lowStockItems.sort((a, b) => {
      if (a.totalStock !== b.totalStock) return a.totalStock - b.totalStock
      return a.name.localeCompare(b.name)
    })

    // Summary
    const outOfStock = lowStockItems.filter((m) => m.totalStock === 0).length
    const criticalStock = lowStockItems.filter((m) => m.totalStock > 0 && m.totalStock <= 5).length
    const totalValue = lowStockItems.reduce((sum, m) => sum + m.totalValue, 0)
    const totalQuantity = lowStockItems.reduce((sum, m) => sum + m.totalStock, 0)

    return NextResponse.json({
      summary: {
        totalItems: lowStockItems.length,
        outOfStock,
        criticalStock,
        totalValue,
        totalQuantity,
      },
      items: lowStockItems,
    })
  } catch (error) {
    console.error('Low stock report error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch low stock data' },
      { status: 500 }
    )
  }
}
