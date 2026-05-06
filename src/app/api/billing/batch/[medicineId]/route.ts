import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ medicineId: string }> }
) {
  try {
    const { medicineId } = await params
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: batches, error } = await supabase
      .from('Batch')
      .select('id, batchNumber, quantity, purchasePrice, mrp, expiryDate, medicine:Medicine(name, gstPercent, unitType, strength)')
      .eq('medicineId', medicineId)
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .gt('quantity', 0)
      .order('expiryDate', { ascending: true })

    if (error) throw error

    return NextResponse.json(batches)
  } catch (error) {
    console.error('Batch fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 })
  }
}
