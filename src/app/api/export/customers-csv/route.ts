import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { getTenantId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: customers, error } = await supabase
      .from('Customer')
      .select('*, sales:Sale(totalAmount, saleDate)')
      .eq('tenantId', tenantId)
      .eq('isActive', true)
      .order('name', { ascending: true })

    if (error) throw error

    const rows = (customers || []).map((c: any) => {
      const sales = c.sales || []
      const totalOrders = sales.length
      const totalPurchases = sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0)
      const lastVisit = sales.length > 0 
        ? sales.reduce((latest: string, s: any) => new Date(s.saleDate) > new Date(latest) ? s.saleDate : latest, sales[0].saleDate)
        : null

      return [
        `"${c.name}"`,
        c.phone ?? '',
        c.email ?? '',
        c.doctorName ?? '',
        totalOrders,
        totalPurchases.toFixed(2),
        lastVisit ? format(new Date(lastVisit), 'yyyy-MM-dd') : 'Never',
        format(new Date(c.createdAt), 'yyyy-MM-dd'),
      ].join(',')
    })

    const header = 'Name,Phone,Email,Doctor,Total Orders,Total Purchases,Last Visit,Join Date'
    const csv = [header, ...rows].join('\n')
    const filename = `customers-report-${format(new Date(), 'yyyy-MM-dd')}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Customers CSV export error:', error)
    return NextResponse.json({ error: 'Failed to export customers CSV' }, { status: 500 })
  }
}
