import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET() {
  try {
    const now = new Date()
    const nowIso = now.toISOString()
    const expiringThreshold = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // We'll perform multiple queries and aggregate in memory where needed
    const [
      { count: totalActiveMedicines },
      { data: allBatches },
      { data: medicineQuality },
      { data: allSaleItems },
      { data: recentSalesResult }
    ] = await Promise.all([
      // Total active medicines
      supabase.from('medicines').select('*', { count: 'exact', head: true }).eq('isActive', true),
      
      // All active batches for stock/expiry calculations
      supabase.from('batches').select('quantity, mrp, expiry_date').eq('isActive', true),
      
      // Medicine quality (complete info)
      supabase.from('medicines').select('id')
        .eq('isActive', true)
        .not('generic_name', 'is', null)
        .not('company_name', 'is', null)
        .not('composition', 'is', null)
        .not('strength', 'is', null)
        .not('category', 'is', null),
      
      // SaleItems for top medicines (simplified top medicines calculation)
      supabase.from('SaleItem').select('medicineName, quantity, totalAmount'),
      
      // Recent sales
      supabase.from('Sale').select('*, Customer(name)').order('saleDate', { ascending: false }).limit(10)
    ])

    // 1. Stock calculations
    const totalStock = (allBatches || []).reduce((sum, b) => sum + (b.quantity || 0), 0)
    const calculatedStockValue = (allBatches || []).reduce((sum, b) => sum + (b.quantity || 0) * (b.mrp || 0), 0)

    // 2. Expiry calculations
    const expiredCount = (allBatches || []).filter(b => (b.quantity || 0) > 0 && new Date(b.expiry_date) < now).length
    const expiringCount = (allBatches || []).filter(b => (b.quantity || 0) > 0 && new Date(b.expiry_date) >= now && new Date(b.expiry_date) <= new Date(expiringThreshold)).length

    // 3. Low stock calculation
    // This is tricky without a join in JS, so we'll fetch medicines and sum their batches
    const { data: medicinesWithBatches } = await supabase
      .from('medicines')
      .select('id, batches(quantity)')
      .eq('isActive', true)
    
    const lowStockItems = (medicinesWithBatches || []).filter(m => {
      const total = (m.batches || []).reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)
      return total < 10
    })
    const lowStockCount = lowStockItems.length

    // 4. Top medicines
    const medicineSalesMap = new Map<string, { totalSold: number; revenue: number }>()
    for (const item of allSaleItems || []) {
      const current = medicineSalesMap.get(item.medicineName) || { totalSold: 0, revenue: 0 }
      medicineSalesMap.set(item.medicineName, {
        totalSold: current.totalSold + (item.quantity || 0),
        revenue: current.revenue + (item.totalAmount || 0)
      })
    }
    const topMedicines = Array.from(medicineSalesMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // 5. Recent sales
    const recentSales = (recentSalesResult || []).map((s: any) => ({
      invoiceNo: s.invoiceNo,
      customer: s.Customer?.name || 'Walk-in',
      amount: s.totalAmount,
      date: s.saleDate,
    }))

    const medicineQualityCount = (medicineQuality || []).length
    const totalActiveMeds = totalActiveMedicines || 0

    return NextResponse.json({
      totalMedicines: totalActiveMeds,
      totalStock,
      totalStockValue: calculatedStockValue,
      lowStockCount,
      expiredCount,
      expiringCount,
      topMedicines,
      recentSales,
      dataQuality: {
        totalMedicines: totalActiveMeds,
        completeInfo: medicineQualityCount,
        percentage: totalActiveMeds > 0
          ? Math.round((medicineQualityCount / totalActiveMeds) * 100)
          : 0,
      },
      stockHealth: {
        totalMedicines: totalActiveMeds,
        healthyStock: totalActiveMeds - lowStockCount,
        lowOrExpired: lowStockCount + expiredCount,
        percentage: totalActiveMeds > 0
          ? Math.round(((totalActiveMeds - lowStockCount - expiredCount) / totalActiveMeds) * 100)
          : 0,
      },
    })
  } catch (error) {
    console.error('GET /api/admin/pharmacy-monitor error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pharmacy monitor data' },
      { status: 500 },
    )
  }
}
