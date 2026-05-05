'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { 
  Search, 
  Calendar as CalendarIcon, 
  Filter, 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  Printer, 
  Trash2, 
  Download,
  IndianRupee,
  CalendarDays,
  FileText,
  CreditCard,
  History,
  MoreVertical,
  X,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, isValid } from 'date-fns'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// ── Types ───────────────────────────────────────────────────────────────────

interface SaleItem {
  id: string
  medicineName: string
  quantity: number
  mrp: number
  totalAmount: number
  medicine: {
    unitType: string
  }
}

interface Sale {
  id: string
  invoiceNo: string
  saleDate: string
  totalAmount: number
  paymentMode: string
  customer?: {
    name: string
    phone: string
  }
  doctorName?: string
  items: SaleItem[]
}

interface SalesResponse {
  sales: Sale[]
  totalCount: number
  totalPages: number
  summary: {
    totalSales: number
    todaySales: number
    monthSales: number
    totalInvoices: number
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) => {
  return '₹' + (amount ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function DatePickerField({
  label,
  date,
  onDateChange,
}: {
  label: string
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 w-[160px] justify-start text-left font-normal h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <CalendarDays className="h-4 w-4 text-zinc-400" />
            {date && isValid(date) ? format(date, 'dd MMM yyyy') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              onDateChange(d)
              setOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ── Invoice Detail View ─────────────────────────────────────────────────────

function InvoicePreview({ sale, open, onOpenChange }: { sale: Sale | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!sale) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
        <div className="bg-white dark:bg-zinc-950 p-8 print:p-0">
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8 border-b pb-6 border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-2xl font-bold text-teal-600 mb-1 tracking-tight">TAX INVOICE</h2>
              <div className="space-y-1">
                <p className="text-sm font-medium">Invoice No: <span className="text-zinc-500">{sale.invoiceNo}</span></p>
                <p className="text-sm font-medium">Date: <span className="text-zinc-500">{format(parseISO(sale.saleDate), 'dd MMM yyyy, hh:mm a')}</span></p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-2 bg-teal-500/5 text-teal-600 border-teal-500/20 px-3 py-1">
                {sale.paymentMode.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Customer & Doctor Info */}
          <div className="grid grid-cols-2 gap-8 mb-8 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 rounded-xl">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Patient Details</p>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">{sale.customer?.name || 'Walk-in Customer'}</p>
              <p className="text-sm text-zinc-500">{sale.customer?.phone || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Consultant Doctor</p>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">{sale.doctorName || 'Self'}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-2 border-zinc-100 dark:border-zinc-800">
                  <TableHead className="w-[10px] text-zinc-400 font-bold">#</TableHead>
                  <TableHead className="text-zinc-400 font-bold">Medicine Name</TableHead>
                  <TableHead className="text-right text-zinc-400 font-bold">Qty</TableHead>
                  <TableHead className="text-right text-zinc-400 font-bold">MRP</TableHead>
                  <TableHead className="text-right text-zinc-400 font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item, idx) => (
                  <TableRow key={item.id} className="border-zinc-50 dark:border-zinc-900">
                    <TableCell className="text-xs text-zinc-400">{idx + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{item.medicineName}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {item.quantity} <span className="text-[10px] text-zinc-400 ml-0.5">{item.medicine?.unitType || 'unit'}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatCurrency(item.mrp)}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-sm">{formatCurrency(item.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                <span className="text-zinc-900 dark:text-zinc-100">Total Amount</span>
                <span className="text-teal-600">{formatCurrency(sale.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center border-t pt-6 border-zinc-100 dark:border-zinc-900">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium italic">Thank you for visiting. Get well soon!</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 flex justify-end gap-3 rounded-b-lg border-t border-zinc-100 dark:border-zinc-800 print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Printer className="w-4 h-4" />
            Print Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function SalesHistoryPage() {
  const currentTenant = useAppStore((s) => s.currentTenant)
  const queryClient = useQueryClient()
  
  // Filters State
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString())
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)
  const [paymentMode, setPaymentMode] = useState('all')

  const { salesFilters, setSalesFilters } = useAppStore()

  // Pre-fill filters from store (e.g. from Dashboard "View All")
  useEffect(() => {
    if (Object.keys(salesFilters).length > 0) {
      if (salesFilters.search) setSearch(salesFilters.search)
      if (salesFilters.year) setYear(salesFilters.year)
      if (salesFilters.month) setMonth(salesFilters.month)
      if (salesFilters.paymentMode) setPaymentMode(salesFilters.paymentMode)
      if (salesFilters.fromDate) setFromDate(parseISO(salesFilters.fromDate))
      if (salesFilters.toDate) setToDate(parseISO(salesFilters.toDate))
      
      // Clear filters after applying to prevent sticking
      setSalesFilters({})
    }
  }, [salesFilters, setSalesFilters])
  
  // View/Detail State
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // ── Data Fetching ──
  const { data, isLoading, isError, refetch } = useQuery<SalesResponse>({
    queryKey: ['sales-history', page, search, year, month, paymentMode, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenantId: currentTenant?.id || '',
        page: page.toString(),
        search,
        paymentMode,
      })
      if (fromDate && isValid(fromDate)) params.append('fromDate', format(fromDate, 'yyyy-MM-dd'))
      if (toDate && isValid(toDate)) params.append('toDate', format(toDate, 'yyyy-MM-dd'))
      
      // Only send year/month if specific range is NOT selected
      if (!fromDate && !toDate) {
        params.append('year', year)
        params.append('month', month)
      }

      const res = await fetch(`/api/sales?${params}`)
      if (!res.ok) throw new Error('Failed to fetch sales')
      return res.json()
    },
    enabled: !!currentTenant?.id,
  })

  // ── Delete Mutation ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sales?id=${id}&tenantId=${currentTenant?.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Invoice deleted')
      queryClient.invalidateQueries({ queryKey: ['sales-history'] })
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to delete invoice'),
  })

  // ── Handlers ──
  const handleView = (sale: Sale) => {
    setSelectedSale(sale)
    setPreviewOpen(true)
  }

  // Grouped Sales logic
  const groupedSales = useMemo(() => {
    if (!data?.sales) return []
    const groups: { [key: string]: Sale[] } = {}
    data.sales.forEach((sale) => {
      const d = parseISO(sale.saleDate)
      const dateKey = isValid(d) ? format(d, 'eeee, dd MMM yyyy') : 'Unknown Date'
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(sale)
    })
    return Object.entries(groups).map(([date, items]) => ({ date, items }))
  }, [data])

  const handleExportCsv = () => {
    if (!currentTenant?.id) return
    const params = new URLSearchParams({
      tenantId: currentTenant.id,
      search,
      paymentMode,
    })
    if (fromDate && isValid(fromDate)) params.append('fromDate', format(fromDate, 'yyyy-MM-dd'))
    if (toDate && isValid(toDate)) params.append('toDate', format(toDate, 'yyyy-MM-dd'))
    if (!fromDate && !toDate) {
      params.append('year', year)
      params.append('month', month)
    }

    const url = `/api/export/sales-csv?${params.toString()}`
    window.open(url, '_blank')
    toast.success('Sales export started', { description: 'Your CSV file will download shortly.' })
  }

  return (
    <div className="page-enter p-4 lg:p-8 space-y-8 pb-20">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <History className="w-5 h-5 text-teal-600" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Sales History</h1>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Track and manage all your past pharmacy transactions
            <span className="w-1 h-1 rounded-full bg-zinc-300" />
            {data?.summary.totalInvoices || 0} total invoices
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-none shadow-lg shadow-teal-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Today</p>
                <p className="text-lg font-bold truncate">{formatCurrency(data?.summary.todaySales || 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 text-white border-none shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">This Month</p>
                <p className="text-lg font-bold truncate">{formatCurrency(data?.summary.monthSales || 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hidden sm:block border-dashed">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                <History className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Overall</p>
                <p className="text-lg font-bold truncate text-teal-600">{formatCurrency(data?.summary.totalSales || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-none shadow-sm bg-zinc-50/50 dark:bg-zinc-900/50">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by Invoice # or Customer name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <DatePickerField label="From" date={fromDate} onDateChange={setFromDate} />
            <DatePickerField label="To" date={toDate} onDateChange={setToDate} />

            <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 h-11">
              <CreditCard className="w-4 h-4 text-zinc-400" />
              <select 
                value={paymentMode} 
                onChange={(e) => setPaymentMode(e.target.value)}
                className="bg-transparent border-none text-sm focus:outline-none focus:ring-0 min-w-[110px]"
              >
                <option value="all">All Payments</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            {(!fromDate && !toDate) && (
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 h-11">
                <CalendarIcon className="w-4 h-4 text-zinc-400" />
                <select 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)}
                  className="bg-transparent border-none text-sm focus:outline-none focus:ring-0 min-w-[70px]"
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                <select 
                  value={month} 
                  onChange={(e) => setMonth(e.target.value)}
                  className="bg-transparent border-none text-sm focus:outline-none focus:ring-0 min-w-[100px]"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            <Button variant="ghost" onClick={() => { setSearch(''); setYear(new Date().getFullYear().toString()); setMonth((new Date().getMonth()+1).toString()); setFromDate(undefined); setToDate(undefined); setPaymentMode('all') }} className="h-11 px-4 text-zinc-500 hover:text-zinc-800">
              Reset
            </Button>

            <Button variant="outline" onClick={handleExportCsv} className="h-11 gap-2 border-teal-500/30 text-teal-600 hover:bg-teal-50">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="text-center py-20 bg-red-500/5 rounded-2xl border border-red-500/10">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-600">Failed to load sales history</h3>
            <p className="text-sm text-red-400 mt-1">Please try refreshing the page</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-6">Try Again</Button>
          </div>
        ) : groupedSales.length === 0 ? (
          <div className="text-center py-32 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">No invoices found</h3>
            <p className="text-sm text-zinc-500 mt-2 max-w-xs mx-auto leading-relaxed">
              We couldn&apos;t find any sales for the selected filters. Try adjusting your search or dates.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {groupedSales.map((group) => (
              <div key={group.date} className="relative">
                {/* Group Header */}
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md py-3 mb-4 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-900">
                  <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                  <span className="text-sm font-bold tracking-wide uppercase text-zinc-500">{group.date}</span>
                  <div className="flex-1 h-[1px] bg-zinc-100 dark:bg-zinc-900" />
                  <Badge variant="outline" className="text-[10px] font-bold text-zinc-400 border-zinc-200 uppercase tracking-tighter">
                    {group.items.length} {group.items.length === 1 ? 'Sale' : 'Sales'}
                  </Badge>
                </div>

                {/* Invoices List */}
                <div className="space-y-3">
                  {group.items.map((sale) => (
                    <Card 
                      key={sale.id} 
                      className="group overflow-hidden transition-all duration-300 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/5 cursor-pointer"
                      onClick={() => handleView(sale)}
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
                          {/* Invoice Meta */}
                          <div className="flex-1 p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-8">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center shrink-0 group-hover:bg-teal-500/10 transition-colors">
                                <FileText className="w-5 h-5 text-zinc-400 group-hover:text-teal-600 transition-colors" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate tracking-tight">{sale.invoiceNo}</p>
                                <p className="text-[11px] text-zinc-400 font-medium">{format(parseISO(sale.saleDate), 'hh:mm a')}</p>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 sm:border-l sm:pl-8 border-zinc-100 dark:border-zinc-800">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Customer</p>
                              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{sale.customer?.name || 'Walk-in Customer'}</p>
                              {sale.customer?.phone && <p className="text-[11px] text-zinc-500">{sale.customer.phone}</p>}
                            </div>

                            <div className="sm:border-l sm:pl-8 border-zinc-100 dark:border-zinc-800">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Items</p>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-zinc-100 text-zinc-600">{sale.items.length}</Badge>
                                <p className="text-[11px] font-medium text-zinc-500">Products</p>
                              </div>
                            </div>
                          </div>

                          {/* Price & Actions */}
                          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 lg:p-5 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-zinc-100 dark:border-zinc-800 min-w-[160px]">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 hidden sm:block">Amount Paid</p>
                            <div className="flex flex-col items-start sm:items-end">
                              <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums leading-none mb-1">
                                {formatCurrency(sale.totalAmount)}
                              </p>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[9px] h-4 px-1.5 uppercase font-bold tracking-tighter border-zinc-200",
                                  sale.paymentMode === 'cash' ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20" :
                                  sale.paymentMode === 'credit' ? "bg-red-500/5 text-red-600 border-red-500/20" :
                                  "bg-blue-500/5 text-blue-600 border-blue-500/20"
                                )}
                              >
                                {sale.paymentMode}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 sm:hidden">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400"><Eye className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400"><Printer className="w-4 h-4" /></Button>
                            </div>
                          </div>
                          
                          {/* Desktop Actions */}
                          <div className="hidden sm:flex items-center pr-4 pl-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-900">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(sale) }} className="gap-2">
                                    <Eye className="w-3.5 h-3.5" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(sale) }} className="gap-2">
                                    <Printer className="w-3.5 h-3.5" /> Print Invoice
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }} className="gap-2">
                                    <Download className="w-3.5 h-3.5" /> Download PDF
                                  </DropdownMenuItem>
                                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                  <DropdownMenuItem 
                                    onClick={(e) => { e.stopPropagation(); setDeleteId(sale.id) }} 
                                    className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Invoice
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {data && data.totalPages > 1 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-100 dark:border-zinc-900 p-4 flex items-center justify-center gap-4 z-20">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="rounded-lg px-4"
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: data.totalPages }).map((_, i) => (
              <Button
                key={i}
                variant={page === i + 1 ? 'default' : 'ghost'}
                size="icon"
                className={cn("h-8 w-8 rounded-lg text-xs", page === i + 1 ? "bg-teal-600 text-white shadow-lg shadow-teal-500/20" : "")}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === data.totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="rounded-lg px-4"
          >
            Next
          </Button>
        </div>
      )}

      {/* Invoice Detail Modal */}
      <InvoicePreview 
        sale={selectedSale} 
        open={previewOpen} 
        onOpenChange={setPreviewOpen} 
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription className="py-2 text-sm leading-relaxed">
              Are you sure you want to delete this invoice? This action cannot be undone and will remove the record from your sales history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 sm:flex-none">Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
