import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'daily'
    const dateParam = searchParams.get('date')
    const monthParam = searchParams.get('month')

    // Fetch store settings
    const store = await db.storeSetting.findFirst()
    const storeName = store?.storeName || 'PharmPOS Pharmacy'
    const storeAddress = store?.address || ''
    const storePhone = store?.phone || ''
    const storeGst = store?.gstNumber || ''

    let sales: Array<{
      invoiceNo: string
      customerName: string | null
      saleDate: Date
      totalAmount: number
      paymentMode: string
      itemCount: number
      items: Array<{ medicineName: string; quantity: number; totalAmount: number }>
    }> = []
    let title = ''
    let totalSales = 0
    let totalItems = 0

    if (type === 'daily' && dateParam) {
      title = `Daily Sales Report - ${dateParam}`
      const dayStart = new Date(dateParam)
      const dayEnd = new Date(dateParam)
      dayEnd.setDate(dayEnd.getDate() + 1)

      sales = await db.sale.findMany({
        where: { saleDate: { gte: dayStart, lt: dayEnd } },
        include: { items: true },
        orderBy: { saleDate: 'desc' },
      }) as typeof sales

      totalSales = sales.reduce((s, sale) => s + sale.totalAmount, 0)
      totalItems = sales.reduce((s, sale) => s + sale.items.reduce((a, i) => a + i.quantity, 0), 0)
    } else if (type === 'monthly' && monthParam) {
      title = `Monthly Sales Report - ${monthParam}`
      const [year, month] = monthParam.split('-').map(Number)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 1)

      sales = await db.sale.findMany({
        where: { saleDate: { gte: monthStart, lt: monthEnd } },
        include: { items: true },
        orderBy: { saleDate: 'desc' },
      }) as typeof sales

      totalSales = sales.reduce((s, sale) => s + sale.totalAmount, 0)
      totalItems = sales.reduce((s, sale) => s + sale.items.reduce((a, i) => a + i.quantity, 0), 0)
    } else {
      return NextResponse.json({ error: 'Missing date or month parameter' }, { status: 400 })
    }

    const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20mm; }
      .no-print { display: none; }
    }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 20px; color: #0d9488; margin: 0 0 4px; }
    .header p { margin: 2px 0; font-size: 11px; color: #666; }
    .title { font-size: 16px; font-weight: 700; text-align: center; margin: 16px 0 12px; color: #1a1a1a; }
    .summary { display: flex; gap: 16px; margin-bottom: 16px; }
    .summary-card { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
    .summary-card .value { font-size: 18px; font-weight: 700; color: #0d9488; }
    .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f0fdfa; color: #0d9488; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #0d9488; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #999; }
    .no-print { text-align: center; margin: 20px 0; }
    .no-print button { padding: 10px 24px; background: #0d9488; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .no-print button:hover { background: #0f766e; }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="header">
    <h1>💊 ${storeName}</h1>
    ${storeAddress ? `<p>${storeAddress}</p>` : ''}
    ${storePhone ? `<p>📞 ${storePhone}</p>` : ''}
    ${storeGst ? `<p>GSTIN: ${storeGst}</p>` : ''}
  </div>
  <div class="title">${title}</div>
  <div class="summary">
    <div class="summary-card"><div class="value">₹${fmt(totalSales)}</div><div class="label">Total Sales</div></div>
    <div class="summary-card"><div class="value">${sales.length}</div><div class="label">Transactions</div></div>
    <div class="summary-card"><div class="value">${totalItems}</div><div class="label">Items Sold</div></div>
    <div class="summary-card"><div class="value">₹${sales.length > 0 ? fmt(totalSales / sales.length) : '0.00'}</div><div class="label">Avg. Bill Value</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Invoice</th>
        <th>Customer</th>
        <th>Items</th>
        <th>Amount (₹)</th>
        <th>Payment</th>
      </tr>
    </thead>
    <tbody>
      ${sales.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${s.invoiceNo}</td>
        <td>${s.customerName || 'Walk-in'}</td>
        <td>${s.itemCount}</td>
        <td style="font-weight:600">₹${fmt(s.totalAmount)}</td>
        <td><span style="text-transform:uppercase;font-size:10px;padding:2px 6px;border-radius:4px;background:#f0fdfa;color:#0d9488">${s.paymentMode}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">Generated by PharmPOS v2.1 — ${new Date().toLocaleString('en-IN')} | ${storeName}</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error generating sales PDF:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
