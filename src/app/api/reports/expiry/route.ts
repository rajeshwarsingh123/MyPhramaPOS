import { supabase } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Fetch all active batches with stock > 0 and their medicine info
    const { data: batches, error } = await supabase
      .from('Batch')
      .select('*, medicine:Medicine(name, composition, unitType)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .gt('quantity', 0)
      .order('expiryDate', { ascending: true })

    if (error) throw error

    type ExpiryItem = {
      id: string
      batchNumber: string
      medicineName: string
      composition: string | null
      unitType: string
      quantity: number
      mrp: number
      expiryDate: string
      daysLeft: number
      valueAtRisk: number
    }

    const expired: ExpiryItem[] = []
    const expiring7d: ExpiryItem[] = []
    const expiring30d: ExpiryItem[] = []
    const expiring90d: ExpiryItem[] = []

    for (const batch of (batches || [])) {
      const expiryDate = new Date(batch.expiryDate)
      const daysLeft = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const valueAtRisk = batch.quantity * batch.mrp

      const item: ExpiryItem = {
        id: batch.id,
        batchNumber: batch.batchNumber,
        medicineName: (batch.medicine as any).name,
        composition: (batch.medicine as any).composition,
        unitType: (batch.medicine as any).unitType,
        quantity: batch.quantity,
        mrp: batch.mrp,
        expiryDate: batch.expiryDate,
        daysLeft,
        valueAtRisk,
      }

      if (daysLeft < 0) {
        expired.push(item)
      } else if (daysLeft <= 7) {
        expiring7d.push(item)
      } else if (daysLeft <= 30) {
        expiring30d.push(item)
      } else if (daysLeft <= 90) {
        expiring90d.push(item)
      }
    }

    return NextResponse.json({
      expired,
      expiring7d,
      expiring30d,
      expiring90d,
    })
  } catch (error) {
    console.error('Expiry report error:', error)
    return NextResponse.json({ error: 'Failed to fetch expiry report' }, { status: 500 })
  }
}
