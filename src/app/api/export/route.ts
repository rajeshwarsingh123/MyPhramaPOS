import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { format, differenceInDays } from 'date-fns'

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

    // Only CSV supported for now
    if (formatParam && formatParam !== 'csv') {
      return NextResponse.json(
        { error: 'Unsupported format. Only CSV is supported currently.' },
        { status: 400 },
      )
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

    switch (type) {
      case 'medicines':
        return exportMedicines(timestamp)
      case 'stock':
        return exportStock(timestamp)
      case 'customers':
        return exportCustomers(timestamp)
      case 'sales':
        return exportSales(timestamp)
      case 'purchases':
        return exportPurchases(timestamp)
    }
  } catch (error) {
    console.error(`Export error:`, error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}

async function exportMedicines(timestamp: string) {
  const medicines = await db.medicine.findMany({
    where: { isActive: true },
    include: {
      batches: {
        where: { isActive: true },
        select: { quantity: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const header = 'Name,Generic Name,Company Name,Composition,Strength,Category,Unit Type,Selling Price,GST %,Total Stock,Status'

  const rows = medicines.map((m) => {
    const totalStock = m.batches.reduce((sum, b) => sum + b.quantity, 0)
    let status = 'In Stock'
    if (totalStock === 0) status = 'Out of Stock'
    else if (totalStock < 10) status = 'Low Stock'

    return [
      escapeCsv(m.name),
      escapeCsv(m.genericName),
      escapeCsv(m.companyName),
      escapeCsv(m.composition),
      escapeCsv(m.strength),
      escapeCsv(m.category),
      escapeCsv(m.unitType),
      escapeCsv(m.sellingPrice.toFixed(2)),
      escapeCsv(m.gstPercent.toFixed(1)),
      escapeCsv(totalStock),
      escapeCsv(status),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')
  return csvResponse(csv, `medicines-export-${timestamp}.csv`)
}

async function exportStock(timestamp: string) {
  const now = new Date()

  const batches = await db.batch.findMany({
    where: { isActive: true },
    include: {
      medicine: {
        select: { name: true, isActive: true },
      },
    },
    orderBy: { expiryDate: 'asc' },
  })

  const header = 'Medicine Name,Batch Number,Quantity,Purchase Price,MRP,Expiry Date,Days Left,Status'

  const rows = batches.map((b) => {
    const daysLeft = differenceInDays(new Date(b.expiryDate), now)
    let status = 'Safe'
    if (daysLeft < 0) status = 'Expired'
    else if (daysLeft <= 7) status = 'Critical'
    else if (daysLeft <= 30) status = 'Expiring Soon'
    else if (daysLeft <= 90) status = 'Warning'

    return [
      escapeCsv(b.medicine.name),
      escapeCsv(b.batchNumber),
      escapeCsv(b.quantity),
      escapeCsv(b.purchasePrice.toFixed(2)),
      escapeCsv(b.mrp.toFixed(2)),
      escapeCsv(format(new Date(b.expiryDate), 'yyyy-MM-dd')),
      escapeCsv(daysLeft < 0 ? 0 : daysLeft),
      escapeCsv(status),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')
  return csvResponse(csv, `stock-export-${timestamp}.csv`)
}

async function exportCustomers(timestamp: string) {
  const customers = await db.customer.findMany({
    where: { isActive: true },
    include: {
      sales: {
        select: {
          totalAmount: true,
          saleDate: true,
        },
        orderBy: { saleDate: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  const header = 'Name,Phone,Email,Address,Doctor Name,Total Purchases,Total Orders,Last Visit,Status'

  const rows = customers.map((c) => {
    const totalOrders = c.sales.length
    const totalPurchases = c.sales.reduce((sum, s) => sum + s.totalAmount, 0)
    const lastVisit = c.sales.length > 0 ? format(new Date(c.sales[0].saleDate), 'yyyy-MM-dd') : 'Never'
    let status = 'Active'
    if (totalOrders === 0) status = 'New'
    else if (totalOrders > 10) status = 'Regular'

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

  const csv = [header, ...rows].join('\n')
  return csvResponse(csv, `customers-export-${timestamp}.csv`)
}

async function exportSales(timestamp: string) {
  const sales = await db.sale.findMany({
    include: {
      customer: {
        select: { name: true },
      },
      items: {
        select: { id: true },
      },
    },
    orderBy: { saleDate: 'desc' },
  })

  const header = 'Invoice No,Customer Name,Sale Date,Subtotal,Total Discount,Total GST,Total Amount,Payment Mode,Item Count'

  const rows = sales.map((s) => {
    return [
      escapeCsv(s.invoiceNo),
      escapeCsv(s.customer?.name ?? 'Walk-in'),
      escapeCsv(format(new Date(s.saleDate), 'yyyy-MM-dd HH:mm')),
      escapeCsv(s.subtotal.toFixed(2)),
      escapeCsv(s.totalDiscount.toFixed(2)),
      escapeCsv(s.totalGst.toFixed(2)),
      escapeCsv(s.totalAmount.toFixed(2)),
      escapeCsv(s.paymentMode),
      escapeCsv(s.items.length),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')
  return csvResponse(csv, `sales-export-${timestamp}.csv`)
}

async function exportPurchases(timestamp: string) {
  const purchases = await db.purchaseOrder.findMany({
    include: {
      supplier: {
        select: { name: true },
      },
      items: {
        select: { id: true },
      },
    },
    orderBy: { invoiceDate: 'desc' },
  })

  const header = 'Invoice No,Supplier Name,Invoice Date,Total Amount,Total GST,Items Count'

  const rows = purchases.map((p) => {
    return [
      escapeCsv(p.invoiceNo ?? 'N/A'),
      escapeCsv(p.supplier.name),
      escapeCsv(format(new Date(p.invoiceDate), 'yyyy-MM-dd')),
      escapeCsv(p.totalAmount.toFixed(2)),
      escapeCsv(p.totalGst.toFixed(2)),
      escapeCsv(p.items.length),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')
  return csvResponse(csv, `purchases-export-${timestamp}.csv`)
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
