'use client'

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  RotateCcw,
  Search,
  X,
  ChevronDown,
  Minus,
  Plus,
  Loader2,
  AlertCircle,
  FileText,
  Package,
  Calendar,
  Filter,
  ArrowLeftRight,
  TrendingDown,
  Receipt,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Types ────────────────────────────────────────────────────────────────

interface InvoiceSearchResult {
  id: string
  invoiceNo: string
  saleDate: string
  customerName: string
  totalAmount: number
  paymentMode: string
  itemCount: number
  notes?: string | null
}

interface SaleDetailItem {
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
  medicine: {
    name: string
  }
  returns: Array<{
    id: string
    returnQty: number
    reason: string
  }>
}

interface SaleDetail {
  id: string
  invoiceNo: string
  saleDate: string
  totalAmount: number
  paymentMode: string
  subtotal: number
  totalGst: number
  totalDiscount: number
  notes?: string | null
  customer?: { name: string; phone?: string } | null
  items: SaleDetailItem[]
}

interface ReturnRecord {
  id: string
  saleInvoiceNo: string
  originalSaleId: string
  saleItemId: string
  medicineName: string
  returnQty: number
  reason: string
  refundAmount: number
  returnDate: string
  paymentMode: string
  customerName: string
}

type ReturnReason = 'Damaged' | 'Expired' | 'Wrong Item' | 'Customer Request' | 'Other'

const RETURN_REASONS: ReturnReason[] = [
  'Damaged',
  'Expired',
  'Wrong Item',
  'Customer Request',
  'Other',
]

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDateTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a')
  } catch {
    return dateStr
  }
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

function getReasonColor(reason: string): string {
  switch (reason) {
    case 'Damaged':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
    case 'Expired':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    case 'Wrong Item':
      return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
    case 'Customer Request':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-300 dark:border-gray-800'
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function SalesReturnsPage() {
  const queryClient = useQueryClient()

  // ── Active Tab ──
  const [activeTab, setActiveTab] = useState<'new-return' | 'history'>('new-return')

  // ── Search State (New Return) ──
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery])

  // ── Fetch invoices for search ──
  const { data: searchResults, isLoading: searchLoading } = useQuery<{
    invoices: InvoiceSearchResult[]
  }>({
    queryKey: ['return-invoice-search', debouncedSearch],
    queryFn: () => {
      const params = debouncedSearch
        ? `?search=${encodeURIComponent(debouncedSearch)}`
        : ''
      return fetch(`/api/billing/invoices${params}&limit=20`).then((r) => r.json())
    },
    enabled: activeTab === 'new-return',
  })

  const invoices = useMemo(() => {
    if (!searchResults?.invoices) return []
    // Filter out return invoices (they have "RETURN from" in notes)
    return searchResults.invoices.filter(
      (inv) => !inv.notes?.includes('RETURN from')
    )
  }, [searchResults])

  // ── Sale Detail Dialog ──
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSearchResult | null>(null)
  const [showSaleDetail, setShowSaleDetail] = useState(false)

  // Fetch full sale details
  const { data: saleDetail, isLoading: detailLoading } = useQuery<SaleDetail>({
    queryKey: ['sale-detail-for-return', selectedInvoice?.id],
    queryFn: () =>
      fetch(`/api/billing/invoice/${selectedInvoice!.invoiceNo}`).then((r) => r.json()),
    enabled: !!selectedInvoice,
  })

  // ── Return Items State ──
  const [returnItems, setReturnItems] = useState<Record<string, { qty: number; reason: string }>>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelectInvoice = useCallback((invoice: InvoiceSearchResult) => {
    setSelectedInvoice(invoice)
    setShowSaleDetail(true)
    setReturnItems({})
  }, [])

  const handleUpdateReturnQty = useCallback(
    (saleItemId: string, delta: number, maxQty: number) => {
      setReturnItems((prev) => {
        const current = prev[saleItemId]
        const newQty = current ? current.qty + delta : delta
        if (newQty <= 0) {
          const next = { ...prev }
          delete next[saleItemId]
          return next
        }
        if (newQty > maxQty) return prev
        return {
          ...prev,
          [saleItemId]: { qty: newQty, reason: current?.reason || '' },
        }
      })
    },
    []
  )

  const handleSetReturnReason = useCallback(
    (saleItemId: string, reason: string) => {
      setReturnItems((prev) => ({
        ...prev,
        [saleItemId]: { qty: prev[saleItemId]?.qty || 0, reason },
      }))
    },
    []
  )

  // Calculate refund totals
  const returnSummary = useMemo(() => {
    if (!saleDetail?.items) return { itemCount: 0, totalRefund: 0, items: [] as Array<{ saleItemId: string; medicineName: string; qty: number; reason: string; refund: number }> }

    let totalRefund = 0
    let itemCount = 0
    const items: Array<{ saleItemId: string; medicineName: string; qty: number; reason: string; refund: number }> = []

    for (const item of saleDetail.items) {
      const ret = returnItems[item.id]
      if (ret && ret.qty > 0) {
        const perUnitPrice = item.totalAmount / item.quantity
        const lineRefund = perUnitPrice * ret.qty
        totalRefund += lineRefund
        itemCount += ret.qty
        items.push({
          saleItemId: item.id,
          medicineName: item.medicineName,
          qty: ret.qty,
          reason: ret.reason,
          refund: Math.round(lineRefund * 100) / 100,
        })
      }
    }

    return { itemCount, totalRefund: Math.round(totalRefund * 100) / 100, items }
  }, [saleDetail, returnItems])

  const canSubmit = useMemo(() => {
    return (
      returnSummary.itemCount > 0 &&
      returnSummary.items.every((item) => item.reason.trim() !== '')
    )
  }, [returnSummary])

  // Submit return mutation
  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice) throw new Error('No sale selected')

      const items = returnSummary.items.map((item) => ({
        saleItemId: item.saleItemId,
        quantity: item.qty,
        reason: item.reason,
      }))

      const res = await fetch('/api/billing/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: selectedInvoice.id,
          items,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Return failed')
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Return processed successfully', {
        description: `Return invoice: ${data.invoiceNo}`,
      })
      queryClient.invalidateQueries({ queryKey: ['return-invoice-search'] })
      queryClient.invalidateQueries({ queryKey: ['returns-history'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['quick-sale-medicines'] })
      setShowConfirmDialog(false)
      setShowSaleDetail(false)
      setSelectedInvoice(null)
      setReturnItems({})
    },
    onError: (error: Error) => {
      toast.error('Return failed', {
        description: error.message,
      })
    },
  })

  // ── History Tab State ──
  const [historySearch, setHistorySearch] = useState('')
  const [historyReason, setHistoryReason] = useState('')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')

  const { data: returnsData, isLoading: historyLoading } = useQuery<{
    returns: ReturnRecord[]
    summary: { totalReturns: number; totalRefund: number; totalItemsReturned: number }
  }>({
    queryKey: ['returns-history', historySearch, historyReason, historyFrom, historyTo],
    queryFn: () => {
      const params = new URLSearchParams()
      if (historySearch) params.set('search', historySearch)
      if (historyReason) params.set('reason', historyReason)
      if (historyFrom) params.set('from', historyFrom)
      if (historyTo) params.set('to', historyTo)
      return fetch(`/api/billing/return?${params.toString()}`).then((r) => r.json())
    },
    enabled: activeTab === 'history',
  })

  const returns = returnsData?.returns ?? []
  const summary = returnsData?.summary

  const clearHistoryFilters = useCallback(() => {
    setHistorySearch('')
    setHistoryReason('')
    setHistoryFrom('')
    setHistoryTo('')
  }, [])

  // ── Render ──

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="border-b bg-gradient-to-r from-rose-50/80 via-orange-50/50 to-amber-50/30 dark:from-rose-950/20 dark:via-orange-950/10 dark:to-amber-950/5">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/40 shadow-sm">
                <RotateCcw className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Sales Returns</h1>
                <p className="text-sm text-muted-foreground">
                  Process returns and view return history
                </p>
              </div>
            </div>
            {summary && activeTab === 'history' && (
              <div className="hidden md:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Refunded</p>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(summary.totalRefund)}
                  </p>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Returns</p>
                  <p className="text-lg font-bold">{summary.totalReturns}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 lg:px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('new-return')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                activeTab === 'new-return'
                  ? 'border-rose-500 text-rose-700 dark:text-rose-400 bg-white/50 dark:bg-black/20'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-black/10'
              )}
            >
              <ArrowLeftRight className="h-4 w-4 inline mr-1.5" />
              New Return
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                activeTab === 'history'
                  ? 'border-rose-500 text-rose-700 dark:text-rose-400 bg-white/50 dark:bg-black/20'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-black/10'
              )}
            >
              <FileText className="h-4 w-4 inline mr-1.5" />
              Returns History
              {summary && summary.totalReturns > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-[10px] h-4 px-1.5 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                >
                  {summary.totalReturns}
                </Badge>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {activeTab === 'new-return' ? (
          <NewReturnView
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchLoading={searchLoading}
            invoices={invoices}
            onSelectInvoice={handleSelectInvoice}
          />
        ) : (
          <ReturnsHistoryView
            historySearch={historySearch}
            setHistorySearch={setHistorySearch}
            historyReason={historyReason}
            setHistoryReason={setHistoryReason}
            historyFrom={historyFrom}
            setHistoryFrom={setHistoryFrom}
            historyTo={historyTo}
            setHistoryTo={setHistoryTo}
            clearHistoryFilters={clearHistoryFilters}
            historyLoading={historyLoading}
            returns={returns}
            summary={summary}
          />
        )}
      </div>

      {/* Sale Detail / Return Dialog */}
      <Dialog open={showSaleDetail} onOpenChange={(open) => {
        if (!open) {
          setShowSaleDetail(false)
          setSelectedInvoice(null)
          setReturnItems({})
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-rose-600" />
              Process Return
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice && (
                <>
                  Invoice #{selectedInvoice.invoiceNo} &bull;{' '}
                  {formatDateTime(selectedInvoice.saleDate)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : saleDetail ? (
            <div className="space-y-4 py-2">
              {/* Sale Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[11px] text-muted-foreground">Customer</p>
                  <p className="text-sm font-medium">{saleDetail.customer?.name || 'Walk-in'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[11px] text-muted-foreground">Sale Total</p>
                  <p className="text-sm font-bold">{formatCurrency(saleDetail.totalAmount)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[11px] text-muted-foreground">Payment</p>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {saleDetail.paymentMode}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[11px] text-muted-foreground">Items</p>
                  <p className="text-sm font-medium">{saleDetail.items.length}</p>
                </div>
              </div>

              <Separator />

              {/* Items to Return */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Select Items to Return</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {saleDetail.items.map((item) => {
                    const alreadyReturned = item.returns.reduce(
                      (sum, r) => sum + r.returnQty,
                      0
                    )
                    const maxReturnable = item.quantity - alreadyReturned
                    const ret = returnItems[item.id]
                    const currentQty = ret?.qty || 0

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'rounded-lg border p-3 transition-colors',
                          currentQty > 0
                            ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800'
                            : 'bg-card hover:bg-accent/30'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">
                                {item.medicineName}
                              </p>
                              {alreadyReturned > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                >
                                  {alreadyReturned} already returned
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                              <span>Batch: {item.batch.batchNumber}</span>
                              <span>
                                {item.quantity} × {formatCurrency(item.mrp)}
                              </span>
                              <span className="font-medium text-foreground">
                                {formatCurrency(item.totalAmount)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                handleUpdateReturnQty(item.id, -1, maxReturnable)
                              }
                              disabled={currentQty <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {currentQty}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                handleUpdateReturnQty(item.id, 1, maxReturnable)
                              }
                              disabled={currentQty >= maxReturnable}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Reason Selector - shown when qty > 0 */}
                        {currentQty > 0 && (
                          <div className="mt-2 pt-2 border-t border-rose-200/50 dark:border-rose-800/50">
                            <Select
                              value={ret?.reason || ''}
                              onValueChange={(value) =>
                                handleSetReturnReason(item.id, value)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select reason..." />
                              </SelectTrigger>
                              <SelectContent>
                                {RETURN_REASONS.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Return Summary */}
              {returnSummary.itemCount > 0 && (
                <>
                  <Separator />
                  <div className="p-4 rounded-lg bg-rose-50/70 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800">
                    <h4 className="text-sm font-semibold text-rose-800 dark:text-rose-300 mb-3">
                      Return Summary
                    </h4>
                    <div className="space-y-1.5">
                      {returnSummary.items.map((item) => (
                        <div
                          key={item.saleItemId}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {item.medicineName}
                            </span>
                            <Badge
                              className={cn('text-[9px] px-1.5 py-0 border', getReasonColor(item.reason))}
                            >
                              {item.reason}
                            </Badge>
                          </div>
                          <span className="font-medium">
                            {item.qty} × {formatCurrency(item.refund / item.qty)} ={' '}
                            {formatCurrency(item.refund)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {returnSummary.itemCount} item
                        {returnSummary.itemCount !== 1 ? 's' : ''} to return
                      </span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        Refund: {formatCurrency(returnSummary.totalRefund)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load sale details</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSaleDetail(false)
                setSelectedInvoice(null)
                setReturnItems({})
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowConfirmDialog(true)}
              disabled={!canSubmit}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Process Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Return</AlertDialogTitle>
            <AlertDialogDescription>
              You are returning {returnSummary.itemCount} item
              {returnSummary.itemCount !== 1 ? 's' : ''} from Invoice #
              {selectedInvoice?.invoiceNo}. The stock will be restored and a refund
              of {formatCurrency(returnSummary.totalRefund)} will be recorded. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                returnMutation.mutate()
              }}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirm Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Sub: New Return View ──────────────────────────────────────────────

function NewReturnView({
  searchQuery,
  setSearchQuery,
  searchLoading,
  invoices,
  onSelectInvoice,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchLoading: boolean
  invoices: InvoiceSearchResult[]
  onSelectInvoice: (inv: InvoiceSearchResult) => void
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Search Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Invoice to Return
          </CardTitle>
          <CardDescription>
            Search by invoice number or customer name to find a past sale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type invoice number or customer name..."
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searchLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : invoices.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
          </p>
          {invoices.map((invoice) => (
            <button
              key={invoice.id}
              onClick={() => onSelectInvoice(invoice)}
              className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border bg-card hover:bg-accent/30 hover:shadow-sm transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 shrink-0">
                  <Receipt className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {invoice.invoiceNo}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">
                      {invoice.paymentMode}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {invoice.customerName} &bull; {invoice.itemCount} item
                    {invoice.itemCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(invoice.saleDate)}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-lg">
                  {formatCurrency(invoice.totalAmount)}
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium group-hover:underline">
                  Return →
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : searchQuery ? (
        <div className="text-center py-12">
          <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            No invoices found matching &quot;{searchQuery}&quot;
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="text-center py-12">
          <RotateCcw className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Search for an invoice to start a return
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Enter an invoice number or customer name above
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub: Returns History View ─────────────────────────────────────────

function ReturnsHistoryView({
  historySearch,
  setHistorySearch,
  historyReason,
  setHistoryReason,
  historyFrom,
  setHistoryFrom,
  historyTo,
  setHistoryTo,
  clearHistoryFilters,
  historyLoading,
  returns,
  summary,
}: {
  historySearch: string
  setHistorySearch: (v: string) => void
  historyReason: string
  setHistoryReason: (v: string) => void
  historyFrom: string
  setHistoryFrom: (v: string) => void
  historyTo: string
  setHistoryTo: (v: string) => void
  clearHistoryFilters: () => void
  historyLoading: boolean
  returns: ReturnRecord[]
  summary?: { totalReturns: number; totalRefund: number; totalItemsReturned: number }
}) {
  const hasFilters = historySearch || historyReason || historyFrom || historyTo

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/40">
                <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Refunded</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(summary?.totalRefund || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/40">
                <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Returns</p>
                <p className="text-xl font-bold">{summary?.totalReturns || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/40">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Items Returned</p>
                <p className="text-xl font-bold">{summary?.totalItemsReturned || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistoryFilters}
                className="ml-auto text-xs h-7"
              >
                Clear All
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search invoice / medicine / customer..."
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>
            <Select value={historyReason} onValueChange={setHistoryReason}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Reasons" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={historyFrom}
              onChange={(e) => setHistoryFrom(e.target.value)}
              className="h-9 text-xs"
              placeholder="From date"
            />
            <Input
              type="date"
              value={historyTo}
              onChange={(e) => setHistoryTo(e.target.value)}
              className="h-9 text-xs"
              placeholder="To date"
            />
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : returns.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Invoice</TableHead>
                    <TableHead className="text-xs">Medicine</TableHead>
                    <TableHead className="text-xs text-center">Qty</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs text-right">Refund</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((ret) => (
                    <TableRow key={ret.id} className="text-sm">
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(ret.returnDate)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-medium">
                          {ret.saleInvoiceNo}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        {ret.medicineName}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {ret.returnQty}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-[9px] px-1.5 py-0 border',
                            getReasonColor(ret.reason)
                          )}
                        >
                          {ret.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs text-rose-600 dark:text-rose-400">
                        {formatCurrency(ret.refundAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ret.customerName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <RotateCcw className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {hasFilters
                  ? 'No returns found matching your filters'
                  : 'No returns recorded yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasFilters
                  ? 'Try adjusting your search criteria'
                  : 'Returns will appear here when you process them'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
