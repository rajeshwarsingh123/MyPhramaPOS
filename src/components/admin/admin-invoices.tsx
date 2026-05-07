'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Receipt,
  RefreshCw,
  AlertTriangle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  FileText,
  TrendingUp,
  Hash,
} from 'lucide-react'
import { useState, useMemo } from 'react'

interface Invoice {
  id: string
  invoiceNo: string
  customerName: string
  saleDate: string
  totalAmount: number
  paymentMode: string
  itemCount: number
  subtotal: number
  totalDiscount: number
  totalGst: number
}

function PaymentModeBadge({ mode }: { mode: string }) {
  const config: Record<string, { color: string; label: string }> = {
    cash: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Cash' },
    card: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Card' },
    upi: { color: 'bg-primary/20 text-primary border-primary/30', label: 'UPI' },
    credit: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'Credit' },
  }
  const c = config[mode] ?? { color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: mode }
  return <Badge className={cn(c.color, 'hover:opacity-80')}>{c.label}</Badge>
}

export function AdminInvoices() {
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [paymentMode, setPaymentMode] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Debounced search
  useMemo(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (searchDebounced) params.set('search', searchDebounced)
    if (paymentMode !== 'all') params.set('paymentMode', paymentMode)
    if (fromDate) params.set('fromDate', fromDate)
    if (toDate) params.set('toDate', toDate)
    params.set('page', String(page))
    params.set('limit', '20')
    return params.toString()
  }, [searchDebounced, paymentMode, fromDate, toDate, page])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-invoices', queryParams],
    queryFn: () => fetch(`/api/admin/invoices?${queryParams}`).then((r) => r.json()),
  })

  const invoices: Invoice[] = data?.invoices ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayInvoices = invoices.filter((inv) => inv.saleDate.slice(0, 10) === todayStr).length
  const avgInvoiceValue = invoices.length > 0 ? totalRevenue / invoices.length : 0

  const hasFilters = searchDebounced || paymentMode !== 'all' || fromDate || toDate

  const resetFilters = () => {
    setSearch('')
    setSearchDebounced('')
    setPaymentMode('all')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load invoices</p>
        <Button onClick={() => refetch()} className="bg-primary hover:bg-primary/80 text-white">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Receipt className="h-7 w-7 text-primary" />
            Invoice Monitoring
          </h1>
          <p className="text-white/50 mt-1">
            {data?.total ?? 0} invoices across all tenants
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-white/40">Total Invoices</p>
          </div>
          <p className="text-2xl font-bold text-white">{(data?.total ?? 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Hash className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-xs text-white/40">Today&apos;s Invoices</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">{todayInvoices}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-xs text-white/40">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-xs text-white/40">Avg Invoice Value</p>
          </div>
          <p className="text-2xl font-bold text-amber-400">₹{Math.round(avgInvoiceValue).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white pl-9"
            placeholder="Invoice # or customer..."
          />
        </div>

        <Select value={paymentMode} onValueChange={(v) => { setPaymentMode(v); setPage(1) }}>
          <SelectTrigger className="w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
            <SelectValue placeholder="Payment Mode" />
          </SelectTrigger>
          <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
          className="w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
          placeholder="From"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1) }}
          className="w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
          placeholder="To"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-white/40 hover:text-white/70">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <InvoicesSkeleton />
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <Receipt className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">No invoices found</p>
              <p className="text-xs mt-1">Adjust the search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-white/40 text-xs font-medium">Invoice #</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Customer</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden sm:table-cell">Items</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium">Amount</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium hidden lg:table-cell">Payment</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <span className="text-white font-medium text-sm font-mono">{inv.invoiceNo}</span>
                      </TableCell>
                      <TableCell className="text-white/80 text-sm">{inv.customerName}</TableCell>
                      <TableCell className="text-white/50 text-xs hidden md:table-cell">
                        {new Date(inv.saleDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-white/50 text-xs hidden sm:table-cell">{inv.itemCount}</TableCell>
                      <TableCell className="text-white font-medium text-sm">₹{inv.totalAmount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <PaymentModeBadge mode={inv.paymentMode} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-white/10 text-white/70 hover:bg-white/5"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-white/10 text-white/70 hover:bg-white/5"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => { if (!open) setSelectedInvoice(null) }}>
        <DialogContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Receipt className="h-5 w-5" />
              Invoice Details
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-white/40 mb-1">Invoice Number</p>
                  <p className="text-sm font-mono font-medium text-white">{selectedInvoice.invoiceNo}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Date</p>
                  <p className="text-sm text-white/80">
                    {new Date(selectedInvoice.saleDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Customer</p>
                  <p className="text-sm text-white/80">{selectedInvoice.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Payment Mode</p>
                  <PaymentModeBadge mode={selectedInvoice.paymentMode} />
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Subtotal</span>
                  <span className="text-white">₹{selectedInvoice.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Discount</span>
                  <span className="text-amber-400">-₹{selectedInvoice.totalDiscount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">GST (incl.)</span>
                  <span className="text-white/70">₹{selectedInvoice.totalGst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Items</span>
                  <span className="text-white">{selectedInvoice.itemCount}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2 mt-2">
                  <span className="text-white/80">Total Amount</span>
                  <span className="text-emerald-400">₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InvoicesSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-4 w-20 bg-white/5" />
          <Skeleton className="h-4 w-28 bg-white/5" />
          <Skeleton className="h-4 w-24 bg-white/5 hidden md:block" />
          <Skeleton className="h-4 w-10 bg-white/5 hidden sm:block" />
          <Skeleton className="h-4 w-16 bg-white/5" />
          <Skeleton className="h-5 w-14 rounded-full bg-white/5 hidden lg:block" />
          <div className="flex-1" />
          <Skeleton className="h-7 w-14 rounded bg-white/5" />
        </div>
      ))}
    </div>
  )
}
