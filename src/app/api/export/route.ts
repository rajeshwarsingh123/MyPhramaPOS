import { supabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format, differenceInDays } from 'date-fns'
import { getTenantId } from '@/lib/auth'

type ExportType = 'medicines' | 'stock' | 'customers' | 'sales' | 'purchases'

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as ExportType | null
    const formatParam = searchParams.get('format')

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required query parameter: type. Allowed values: medicines, stock, customers, sales, purchases' },
        { status: 400 },
      )
    }

    const validTypes: ExportType[] = ['medicines', 'stock', 'customers', 'sales', 'purchases']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type "${type}". Allowed values: ${validTypes.join(', ')}` },
        { status: 400 },
      )
    }

    if (formatParam && formatParam !== 'csv') {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

    switch (type) {
      case 'medicines': return exportMedicines(tenantId, timestamp)
      case 'stock': return exportStock(tenantId, timestamp)
      case 'customers': return exportCustomers(tenantId, timestamp)
      case 'sales': return exportSales(tenantId, timestamp)
      case 'purchases': return exportPurchases(tenantId, timestamp)
    }
  } catch (error) {
    console.error(`Export error:`, error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}

async function exportMedicines(tenantId: string, timestamp: string) {
  const { data: medicines } = await supabase
    .from('Medicine')
    .select('*, batches:Batch(quantity, isActive)')
    .eq('tenantId', tenantId)
    .eq('isActive', true)
    .order('name', { ascending: true })

  const header = 'Name,Generic Name,Company Name,Composition,Strength,Category,Unit Type,Selling Price,GST %,Total Stock,Status'
  const rows = (medicines || []).map((m: any) => {
    const totalStock = (m.batches || []).filter((b: any) => b.isActive).reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)
    let status = totalStock === 0 ? 'Out of Stock' : totalStock < 10 ? 'Low Stock' : 'In Stock'

    return [
      escapeCsv(m.name),
      escapeCsv(m.genericName),
      escapeCsv(m.companyName),
      escapeCsv(m.composition),
      escapeCsv(m.strength),
      escapeCsv(m.category),
      escapeCsv(m.unitType),
      escapeCsv((m.sellingPrice || 0).toFixed(2)),
      escapeCsv((m.gstPercent || 0).toFixed(1)),
      escapeCsv(totalStock),
      escapeCsv(status),
    ].join(',')
  })

  return csvResponse([header, ...rows].join('\n'), `medicines-export-${timestamp}.csv`)
}

async function exportStock(tenantId: string, timestamp: string) {
  const now = new Date()
  const { data: batches } = await supabase
    .from('Batch')
    .select('*, medicine:Medicine(name)')
    .eq('tenantId', tenantId)
    .eq('isActive', true)
    .order('expiryDate', { ascending: true })

  const header = 'Medicine Name,Batch Number,Quantity,Purchase Price,MRP,Expiry Date,Days Left,Status'
  const rows = (batches || []).map((b: any) => {
    const daysLeft = differenceInDays(new Date(b.expiryDate), now)
    let status = daysLeft < 0 ? 'Expired' : daysLeft <= 7 ? 'Critical' : daysLeft <= 30 ? 'Expiring Soon' : daysLeft <= 90 ? 'Warning' : 'Safe'

    return [
      escapeCsv((b.medicine as any)?.name),
      escapeCsv(b.batchNumber),
      escapeCsv(b.quantity),
      escapeCsv((b.purchasePrice || 0).toFixed(2)),
      escapeCsv((b.mrp || 0).toFixed(2)),
      escapeCsv(format(new Date(b.expiryDate), 'yyyy-MM-dd')),
      escapeCsv(daysLeft < 0 ? 0 : daysLeft),
      escapeCsv(status),
    ].join(',')
  })

  return csvResponse([header, ...rows].join('\n'), `stock-export-${timestamp}.csv`)
}

async function exportCustomers(tenantId: string, timestamp: string) {
  const { data: customers } = await supabase
    .from('Customer')
    .select('*, sales:Sale(totalAmount, saleDate)')
    .eq('tenantId', tenantId)
    .eq('isActive', true)
    .order('name', { ascending: true })

  const header = 'Name,Phone,Email,Address,Doctor Name,Total Purchases,Total Orders,Last Visit,Status'
  const rows = (customers || []).map((c: any) => {
    const sales = c.sales || []
    const totalOrders = sales.length
    const totalPurchases = sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0)
    const lastVisit = sales.length > 0 ? format(new Date(sales.sort((a: any, b: any) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())[0].saleDate), 'yyyy-MM-dd') : 'Never'
    let status = totalOrders === 0 ? 'New' : totalOrders > 10 ? 'Regular' : 'Active'

    return [
      escapeCsv(c.name),
      escapeCsv(c.phone),
      escapeCsv(c.email),
      escapeCsv(c.address),
      escapeCsv(c.doctorName),
      escapeCsv(totalPurchases.toFixed(2)),
      escapeCsv(totalOrders),
      escapeCsv(lastVisit),
      escapeCsv(status),
    ].join(',')
  })

  return csvResponse([header, ...rows].join('\n'), `customers-export-${timestamp}.csv`)
}

async function exportSales(tenantId: string, timestamp: string) {
  const { data: sales } = await supabase
    .from('Sale')
    .select('*, customer:Customer(name), items:SaleItem(id)')
    .eq('tenantId', tenantId)
    .order('saleDate', { ascending: false })

  const header = 'Invoice No,Customer Name,Sale Date,Subtotal,Total Discount,Total GST,Total Amount,Payment Mode,Item Count'
  const rows = (sales || []).map((s: any) => {
    return [
      escapeCsv(s.invoiceNo),
      escapeCsv((s.customer as any)?.name ?? 'Walk-in'),
      escapeCsv(format(new Date(s.saleDate), 'yyyy-MM-dd HH:mm')),
      escapeCsv((s.subtotal || 0).toFixed(2)),
      escapeCsv((s.totalDiscount || 0).toFixed(2)),
      escapeCsv((s.totalGst || 0).toFixed(2)),
      escapeCsv((s.totalAmount || 0).toFixed(2)),
      escapeCsv(s.paymentMode),
      escapeCsv((s.items || []).length),
    ].join(',')
  })

  return csvResponse([header, ...rows].join('\n'), `sales-export-${timestamp}.csv`)
}

async function exportPurchases(tenantId: string, timestamp: string) {
  const { data: purchases } = await supabase
    .from('purchase_bills')
    .select('*, supplier:Supplier(name), items:purchase_items(id)')
    .eq('tenant_id', tenantId)
    .order('invoice_date', { ascending: false })

  const header = 'Invoice No,Supplier Name,Invoice Date,Total Amount,Total GST,Items Count'
  const rows = (purchases || []).map((p: any) => {
    return [
      escapeCsv(p.invoice_no ?? 'N/A'),
      escapeCsv((p.supplier as any)?.name || 'N/A'),
      escapeCsv(format(new Date(p.invoice_date), 'yyyy-MM-dd')),
      escapeCsv((p.total_amount || 0).toFixed(2)),
      escapeCsv((p.total_gst || 0).toFixed(2)),
      escapeCsv((p.items || []).length),
    ].join(',')
  })

  return csvResponse([header, ...rows].join('\n'), `purchases-export-${timestamp}.csv`)
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
