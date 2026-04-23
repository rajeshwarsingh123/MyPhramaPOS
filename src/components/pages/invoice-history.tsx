'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Search,
  X,
  FileText,
  Printer,
  Eye,
  Calendar,
  IndianRupee,
  Hash,
  Package,
  TrendingUp,
  Clock,
  Loader2,
  Receipt,
  CreditCard,
  Smartphone,
  Wallet,
  ArrowUpDown,
  CalendarDays,
  Filter,
  Inbox,
} from 'lucide-react'
import { format, isToday, isThisWeek, isThisMonth, isThisYear, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { toast } from 'sonner'

// ==================== Types ====================

interface InvoiceListItem {
  id: string
  invoiceNo: string
  saleDate: string
  customerName: string
  totalAmount: number
  paymentMode: string
  itemCount: number
}

interface InvoiceDetail {
  id: string
  invoiceNo: string
  saleDate: string
  customerId?: string
  doctorName?: string
  subtotal: number
  totalGst: number
  totalDiscount: number
  totalAmount: number
  paymentMode: string
  notes?: string
  customer?: {
    id: string
    name: string
    phone?: string
    address?: string
  }
  items: {
    id: string
    medicineName: string
    quantity: number
    mrp: number
    discount: number
    gstPercent: number
    gstAmount: number
    totalAmount: number
    batch: {
      batchNumber: string
      expiryDate: string
    }
  }[]
}

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'all'
type PaymentFilter = 'all' | 'cash' | 'card' | 'upi' | 'credit'

// ==================== Helpers ====================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a')
}

function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'dd MMM yyyy')
}

function getPaymentModeInfo(mode: string): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  colorClass: string
  icon: React.ReactNode
} {
  switch (mode) {
    case 'cash':
      return {
        label: 'Cash',
        variant: 'outline',
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
        icon: <Wallet className="h-3 w-3" />,
      }
    case 'card':
      return {
        label: 'Card',
        variant: 'outline',
        colorClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
        icon: <CreditCard className="h-3 w-3" />,
      }
    case 'upi':
      return {
        label: 'UPI',
        variant: 'outline',
        colorClass: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800',
        icon: <Smartphone className="h-3 w-3" />,
      }
    case 'credit':
      return {
        label: 'Credit',
        variant: 'outline',
        colorClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        icon: <ArrowUpDown className="h-3 w-3" />,
      }
    default:
      return {
        label: mode,
        variant: 'secondary',
        colorClass: '',
        icon: <Receipt className="h-3 w-3" />,
      }
  }
}

function clientSideDateFilter(invoices: InvoiceListItem[], dateFilter: DateFilter): InvoiceListItem[] {
  if (dateFilter === 'all') return invoices
  const now = new Date()
  return invoices.filter((inv) => {
    const saleDate = parseISO(inv.saleDate)
    switch (dateFilter) {
      case 'today':
        return isToday(saleDate)
      case 'week':
        return isThisWeek(saleDate, { weekStartsOn: 1 })
      case 'month':
        return isThisMonth(saleDate)
      case 'year':
        return isThisYear(saleDate)
      default:
        return true
    }
  })
}

function clientSidePaymentFilter(invoices: InvoiceListItem[], paymentFilter: PaymentFilter): InvoiceListItem[] {
  if (paymentFilter === 'all') return invoices
  return invoices.filter((inv) => inv.paymentMode === paymentFilter)
}

// ==================== Component ====================

export function InvoiceHistoryPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter state
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

  // Dialog state
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showReprintDialog, setShowReprintDialog] = useState(false)
  const [reprintData, setReprintData] = useState<InvoiceDetail | null>(null)

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = setTimeout(() => {
        setDebouncedSearch(value)
      }, 300)
    },
    []
  )

  // Fetch invoices list
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery<{
    invoices: InvoiceListItem[]
  }>({
    queryKey: ['invoice-history', debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (debouncedSearch) params.set('search', debouncedSearch)
      return fetch(`/api/billing/invoices?${params.toString()}`).then((r) => r.json())
    },
    staleTime: 30000,
  })

  const allInvoices = invoicesData?.invoices ?? []

  // Apply client-side filters
  const filteredInvoices = useMemo(() => {
    let result = allInvoices
    result = clientSideDateFilter(result, dateFilter)
    result = clientSidePaymentFilter(result, paymentFilter)
    return result
  }, [allInvoices, dateFilter, paymentFilter])

  // Fetch single invoice detail for viewing
  const { data: invoiceDetail, isLoading: isLoadingDetail } = useQuery<InvoiceDetail>({
    queryKey: ['invoice-detail', selectedInvoiceNo],
    queryFn: () => fetch(`/api/billing/invoice/${selectedInvoiceNo}`).then((r) => r.json()),
    enabled: !!selectedInvoiceNo && showViewDialog,
  })

  // Fetch invoice for reprint
  const { data: reprintInvoiceDetail, isLoading: isLoadingReprint } = useQuery<InvoiceDetail>({
    queryKey: ['invoice-reprint', selectedInvoiceNo],
    queryFn: () => fetch(`/api/billing/invoice/${selectedInvoiceNo}`).then((r) => r.json()),
    enabled: !!selectedInvoiceNo && showReprintDialog,
  })

  // Stats
  const stats = useMemo(() => {
    const totalInvoices = filteredInvoices.length
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const thisMonthCount = clientSideDateFilter(allInvoices, 'month').length
    return { totalInvoices, totalRevenue, thisMonthCount }
  }, [filteredInvoices, allInvoices])

  // View invoice
  const handleViewInvoice = useCallback((invoiceNo: string) => {
    setSelectedInvoiceNo(invoiceNo)
    setShowViewDialog(true)
  }, [])

  // Reprint invoice
  const handleReprintInvoice = useCallback((invoiceNo: string) => {
    setSelectedInvoiceNo(invoiceNo)
    setShowReprintDialog(true)
  }, [])

  // Execute print
  const executePrint = useCallback(() => {
    const printContent = document.getElementById('invoice-reprint-area')
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) {
      toast.error('Please allow popups to print invoices')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${reprintData?.invoiceNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            padding: 5mm;
            color: #000;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .store-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
          .store-details { font-size: 10px; margin-bottom: 8px; color: #333; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .invoice-info { display: flex; justify-content: space-between; margin: 4px 0; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; padding: 2px 1px; border-bottom: 1px solid #000; font-weight: bold; }
          td { padding: 2px 1px; }
          .totals { text-align: right; margin-top: 4px; }
          .totals div { margin: 2px 0; }
          .grand-total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
          .thank-you { text-align: center; margin-top: 10px; font-size: 11px; }
          @media print { body { width: 80mm; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }, [reprintData])

  // Update reprint data when loaded
  React.useEffect(() => {
    if (reprintInvoiceDetail) {
      setReprintData(reprintInvoiceDetail)
    }
  }, [reprintInvoiceDetail])

  // Date filter tabs
  const dateFilters: { value: DateFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All' },
  ]

  // Payment filter tabs
  const paymentFilters: { value: PaymentFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'upi', label: 'UPI' },
    { value: 'credit', label: 'Credit' },
  ]

  // ==================== RENDER ====================

  return (
    <div className="p-4 lg:p-6 space-y-6 section-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Invoice History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search past invoices, view details, and reprint bills
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="pharmacy-card card-shadow-lg">
        <CardContent className="p-4 lg:p-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by invoice number or customer name..."
              className="input-focus-smooth focus-teal h-11 pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setDebouncedSearch('')
                  searchInputRef.current?.focus()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Date Filter Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Period</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dateFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setDateFilter(filter.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                    dateFilter === filter.value
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Mode Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Payment Mode</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {paymentFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setPaymentFilter(filter.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5',
                    paymentFilter === filter.value
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {filter.value !== 'all' && (
                    <span className="opacity-80">
                      {getPaymentModeInfo(filter.value).icon}
                    </span>
                  )}
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 section-fade-in">
        <Card className="pharmacy-card card-spotlight hover-lift">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Invoices</p>
              <p className="text-xl font-bold gradient-text-teal">
                {isLoadingInvoices ? (
                  <Skeleton className="h-7 w-16 inline-block" />
                ) : (
                  stats.totalInvoices.toLocaleString('en-IN')
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="pharmacy-card card-spotlight hover-lift">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
              <p className="text-xl font-bold gradient-text-teal">
                {isLoadingInvoices ? (
                  <Skeleton className="h-7 w-24 inline-block" />
                ) : (
                  formatCurrency(stats.totalRevenue)
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="pharmacy-card card-spotlight hover-lift">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">This Month</p>
              <p className="text-xl font-bold gradient-text-teal">
                {isLoadingInvoices ? (
                  <Skeleton className="h-7 w-16 inline-block" />
                ) : (
                  stats.thisMonthCount.toLocaleString('en-IN')
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card className="pharmacy-card card-shadow-lg">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[140px]">Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="w-[130px]">Date</TableHead>
                  <TableHead className="w-[70px] text-center">Items</TableHead>
                  <TableHead className="w-[120px] text-right">Amount</TableHead>
                  <TableHead className="w-[100px]">Payment</TableHead>
                  <TableHead className="w-[130px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInvoices ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState searchQuery={debouncedSearch} />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice, index) => {
                    const paymentInfo = getPaymentModeInfo(invoice.paymentMode)
                    return (
                      <TableRow
                        key={invoice.id}
                        className={cn(
                          'table-row-hover transition-colors',
                          index % 2 === 0 && 'bg-background',
                          index % 2 !== 0 && 'bg-muted/20'
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono text-sm font-semibold text-primary">
                              {invoice.invoiceNo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{invoice.customerName}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDateShort(invoice.saleDate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm">{invoice.itemCount}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-bold">
                            {formatCurrency(invoice.totalAmount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-[10px] gap-1 border', paymentInfo.colorClass)} variant="outline">
                            {paymentInfo.icon}
                            {paymentInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleViewInvoice(invoice.invoiceNo)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleReprintInvoice(invoice.invoiceNo)}
                            >
                              <Printer className="h-3.5 w-3.5 mr-1" />
                              Reprint
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            <ScrollArea className="max-h-[calc(100vh-420px)]">
              <div className="divide-y divide-border/50">
                {isLoadingInvoices ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                      <div className="flex gap-2 pt-1">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <div className="p-6">
                    <EmptyState searchQuery={debouncedSearch} />
                  </div>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const paymentInfo = getPaymentModeInfo(invoice.paymentMode)
                    return (
                      <div key={invoice.id} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-mono text-sm font-semibold text-primary">
                                {invoice.invoiceNo}
                              </span>
                            </div>
                            <p className="text-sm font-medium mt-0.5">{invoice.customerName}</p>
                          </div>
                          <span className="text-sm font-bold">
                            {formatCurrency(invoice.totalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateShort(invoice.saleDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {invoice.itemCount} item{invoice.itemCount !== 1 ? 's' : ''}
                          </div>
                          <Badge className={cn('text-[9px] gap-1 border', paymentInfo.colorClass)} variant="outline">
                            {paymentInfo.icon}
                            {paymentInfo.label}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs flex-1"
                            onClick={() => handleViewInvoice(invoice.invoiceNo)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs flex-1"
                            onClick={() => handleReprintInvoice(invoice.invoiceNo)}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                            Reprint
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Results count footer */}
          {!isLoadingInvoices && filteredInvoices.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground flex items-center gap-1.5">
              <Receipt className="h-3 w-3" />
              Showing {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
              {searchQuery && <span> for &ldquo;{searchQuery}&rdquo;</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== View Invoice Dialog ==================== */}
      <Dialog open={showViewDialog} onOpenChange={(open) => { setShowViewDialog(open); if (!open) setSelectedInvoiceNo(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {isLoadingDetail ? (
            <div className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading invoice...</span>
              </div>
            </div>
          ) : invoiceDetail ? (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Invoice {invoiceDetail.invoiceNo}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDateTime(invoiceDetail.saleDate)}
                  {invoiceDetail.customer && (
                    <>
                      <span className="mx-1">&bull;</span>
                      Customer: {invoiceDetail.customer.name}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 space-y-4">
                {/* Invoice Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/40 border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Payment</p>
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const info = getPaymentModeInfo(invoiceDetail.paymentMode)
                        return (
                          <Badge className={cn('text-xs gap-1 border', info.colorClass)} variant="outline">
                            {info.icon}
                            {info.label}
                          </Badge>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Customer</p>
                    <p className="text-sm font-medium">{invoiceDetail.customer?.name || 'Walk-in'}</p>
                    {invoiceDetail.customer?.phone && (
                      <p className="text-xs text-muted-foreground">{invoiceDetail.customer.phone}</p>
                    )}
                  </div>
                  {invoiceDetail.doctorName && (
                    <div className="p-3 rounded-lg bg-muted/40 border">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Doctor</p>
                      <p className="text-sm font-medium">{invoiceDetail.doctorName}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted/40 border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Items</p>
                    <p className="text-sm font-medium">{invoiceDetail.items.length} medicine{invoiceDetail.items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <Separator />

                {/* Items Table */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Items
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="text-xs">Medicine</TableHead>
                        <TableHead className="text-xs text-center">Qty</TableHead>
                        <TableHead className="text-xs text-right">MRP</TableHead>
                        <TableHead className="text-xs text-center hidden sm:table-cell">Disc%</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceDetail.items.map((item) => (
                        <TableRow key={item.id} className="table-row-hover">
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{item.medicineName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Batch: {item.batch.batchNumber}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(item.mrp)}</TableCell>
                          <TableCell className="text-center text-sm hidden sm:table-cell">
                            {item.discount > 0 ? `${item.discount}%` : '-'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(item.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(invoiceDetail.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST</span>
                    <span>{formatCurrency(invoiceDetail.totalGst)}</span>
                  </div>
                  {invoiceDetail.totalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                      <span>Discount</span>
                      <span>-{formatCurrency(invoiceDetail.totalDiscount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="gradient-text-teal">{formatCurrency(invoiceDetail.totalAmount)}</span>
                  </div>
                </div>

                {invoiceDetail.notes && (
                  <>
                    <Separator />
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold">Notes: </span>{invoiceDetail.notes}
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="p-4 border-t bg-muted/20 rounded-b-lg gap-2 flex-row">
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    setShowViewDialog(false)
                    handleReprintInvoice(invoiceDetail.invoiceNo)
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Reprint
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 sm:flex-none"
                  onClick={() => setShowViewDialog(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Invoice not found
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== Reprint Dialog ==================== */}
      <Dialog open={showReprintDialog} onOpenChange={(open) => { setShowReprintDialog(open); if (!open) { setSelectedInvoiceNo(null); setReprintData(null) } }}>
        <DialogContent className="max-w-md p-0">
          {isLoadingReprint ? (
            <div className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading invoice for reprint...</span>
              </div>
            </div>
          ) : reprintData ? (
            <>
              <DialogHeader className="p-4 pb-0">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Printer className="h-4 w-4 text-primary" />
                  Reprint Invoice
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {reprintData.invoiceNo} &bull; {formatDateShort(reprintData.saleDate)}
                </DialogDescription>
              </DialogHeader>

              {/* Invoice Print Preview */}
              <div className="p-4">
                <div id="invoice-reprint-area" className="bg-white text-black font-mono text-xs rounded-lg border p-4 max-h-[60vh] overflow-y-auto">
                  {/* Store Header */}
                  <div className="center bold">
                    <div className="store-name">My Pharmacy</div>
                    <div className="store-details">Pharmacy &amp; General Store</div>
                    <div className="store-details">Phone: 9876543210</div>
                  </div>

                  <div className="divider" />

                  {/* Invoice Info */}
                  <div className="invoice-info">
                    <span>Invoice:</span>
                    <span className="bold">{reprintData.invoiceNo}</span>
                  </div>
                  <div className="invoice-info">
                    <span>Date:</span>
                    <span>{formatDateTime(reprintData.saleDate)}</span>
                  </div>
                  <div className="invoice-info">
                    <span>Customer:</span>
                    <span>{reprintData.customer?.name || 'Walk-in'}</span>
                  </div>
                  {reprintData.doctorName && (
                    <div className="invoice-info">
                      <span>Doctor:</span>
                      <span>{reprintData.doctorName}</span>
                    </div>
                  )}
                  <div className="invoice-info">
                    <span>Payment:</span>
                    <span className="bold uppercase">{reprintData.paymentMode}</span>
                  </div>

                  <div className="divider" />

                  {/* Items Table */}
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Rate</th>
                        <th style={{ textAlign: 'right' }}>Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reprintData.items.map((item, idx) => (
                        <tr key={item.id}>
                          <td>
                            <div>{item.medicineName}</div>
                            {item.discount > 0 && <div style={{ fontSize: '9px', color: '#666' }}>Disc: {item.discount}%</div>}
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(item.mrp)}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="divider" />

                  {/* Totals */}
                  <div className="totals">
                    <div>
                      <span>Subtotal: </span>
                      <span>{formatCurrency(reprintData.subtotal)}</span>
                    </div>
                    <div>
                      <span>GST: </span>
                      <span>{formatCurrency(reprintData.totalGst)}</span>
                    </div>
                    {reprintData.totalDiscount > 0 && (
                      <div>
                        <span>Discount: </span>
                        <span>-{formatCurrency(reprintData.totalDiscount)}</span>
                      </div>
                    )}
                    <div className="grand-total">
                      <span>TOTAL: </span>
                      <span>{formatCurrency(reprintData.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="divider" />

                  <div className="thank-you">
                    <div className="bold">Thank you for your purchase!</div>
                    <div style={{ marginTop: '4px', fontSize: '9px', color: '#666' }}>
                      Visit again soon
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-4 border-t bg-muted/20 rounded-b-lg gap-2 flex-row">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={executePrint}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Invoice
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 sm:flex-none"
                  onClick={() => setShowReprintDialog(false)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Invoice not found
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== Empty State ====================

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
        <Inbox className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No invoices found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {searchQuery
          ? `No invoices matching "${searchQuery}". Try a different search term or adjust your filters.`
          : 'No invoices yet. Start billing to see your invoice history here.'}
      </p>
    </div>
  )
}
