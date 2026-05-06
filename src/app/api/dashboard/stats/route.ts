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
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const nowIso = now.toISOString()

    // 1. Total active medicines
    const { count: totalMedicines } = await supabase
      .from('medicines')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('isActive', true)

    // 2. Total stock across all active batches
    const { data: batches } = await supabase
      .from('batches')
      .select('quantity')
      .eq('tenant_id', tenantId)
      .eq('isActive', true)
    const totalStock = (batches || []).reduce((sum, b) => sum + (b.quantity || 0), 0)

    // 3. Today's sales
    const { data: todaySalesData } = await supabase
      .from('Sale')
      .select('totalAmount')
      .eq('tenantId', tenantId)
      .gte('saleDate', todayStart)
    const todaySales = (todaySalesData || []).reduce((sum, s) => sum + (s.totalAmount || 0), 0)

    // 4. Month sales
    const { data: monthSalesData } = await supabase
      .from('Sale')
      .select('totalAmount')
      .eq('tenantId', tenantId)
      .gte('saleDate', monthStart)
    const monthSales = (monthSalesData || []).reduce((sum, s) => sum + (s.totalAmount || 0), 0)

    // 5. Low stock Count
    // Fetch medicines and their batches to calculate total stock per medicine
    const { data: medStockData } = await supabase
      .from('medicines')
      .select('id, batches(quantity)')
      .eq('tenant_id', tenantId)
      .eq('isActive', true)
    
    const lowStockCount = (medStockData || []).filter(m => {
      const total = (m.batches || []).reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)
      return total < 10 && (m.batches || []).length > 0
    }).length

    // 6. Expiring soon
    const { count: expiringSoonCount } = await supabase
      .from('batches')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('isActive', true)
      .gt('quantity', 0)
      .gte('expiry_date', nowIso)
      .lte('expiry_date', thirtyDaysFromNow)

    // 7. Expired
    const { count: expiredCount } = await supabase
      .from('batches')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('isActive', true)
      .gt('quantity', 0)
      .lt('expiry_date', nowIso)

    // 8. Recent sales (last 5)
    const { data: recentSales } = await supabase
      .from('Sale')
      .select('*, Customer(name)')
      .eq('tenantId', tenantId)
      .order('saleDate', { ascending: false })
      .limit(5)

    return NextResponse.json({
      totalMedicines: totalMedicines || 0,
      totalStock: totalStock || 0,
      todaySales: todaySales || 0,
      monthSales: monthSales || 0,
      lowStockCount: lowStockCount || 0,
      expiringSoonCount: expiringSoonCount || 0,
      expiredCount: expiredCount || 0,
      recentSales: (recentSales || []).map((s: any) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        customerName: s.Customer?.name ?? 'Walk-in',
        saleDate: s.saleDate,
        totalAmount: s.totalAmount,
        paymentMode: s.paymentMode,
      })),
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}
