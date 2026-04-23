'use client'

import { useState } from 'react'
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
  ArrowDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

// ── Types ────────────────────────────────────────────────────────────────

interface RecentSaleItem {
  id: string
  invoiceNo: string
  saleDate: string
  totalAmount: number
  paymentMode: string
  itemCount: number
  notes?: string | null
  customer?: { name: string; phone?: string } | null
}

interface ReturnableSaleItem {
  id: string
  medicineName: string
  quantity: number
  mrp: number
  batchNumber: string
  expiryDate: string
}

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

// ── Component ──────────────────────────────────────────────────────────────

export function SalesReturnsSection() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery])

  // Fetch recent sales for returns
  const { data: recentSales, isLoading } = useQuery<{ sales: RecentSaleItem[] }>({
    queryKey: ['recent-sales-for-returns', debouncedSearch],
    queryFn: () => {
      const params = debouncedSearch
        ? `?search=${encodeURIComponent(debouncedSearch)}`
        : ''
      return fetch(`/api/billing/invoices${params}&limit=20&excludeReturns=true`).then((r) => r.json())
    },
  })

  // Return dialog state
  const [selectedSale, setSelectedSale] = useState<{
    sale: RecentSaleItem
    items: ReturnableSaleItem[]
  } | null>(null)
  const [returnItems, setReturnItems] = useState<Record<string, number>>({})
  const [returnReason, setReturnReason] = useState('')
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false)

  // Fetch sale details when selected
  const { data: saleDetails, isLoading: detailsLoading } = useQuery<{
    sale: {
      items: ReturnableSaleItem[]
    }
  }>({
    queryKey: ['sale-details-for-return', selectedSale?.sale.id],
    queryFn: () =>
      fetch(`/api/billing/invoice/${selectedSale!.sale.invoiceNo}`).then((r) => r.json()),
    enabled: !!selectedSale && !!selectedSale.sale.invoiceNo,
  })

  // Auto-populate return items when sale details load
  React.useEffect(() => {
    if (saleDetails?.sale?.items) {
      const items: Record<string, number> = {}
      for (const item of saleDetails.sale.items) {
        items[item.id] = item.quantity
      }
      setReturnItems(items)
    }
  }, [saleDetails])

  const handleOpenReturn = (sale: RecentSaleItem) => {
    setSelectedSale({ sale, items: [] })
    setReturnItems({})
    setReturnReason('')
    setOpen(true)
  }

  // Return mutation
  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSale) return

      const items = Object.entries(returnItems)
        .filter(([_, qty]) => qty > 0)
        .map(([saleItemId, quantity]) => ({
          saleItemId,
          quantity,
        }))

      if (items.length === 0) {
        throw new Error('No items selected for return')
      }

      const res = await fetch('/api/billing/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: selectedSale.sale.id,
          items,
          reason: returnReason || undefined,
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
      queryClient.invalidateQueries({ queryKey: ['recent-sales-for-returns'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['quick-sale-medicines'] })
      setOpen(false)
      setSelectedSale(null)
    },
    onError: (error: Error) => {
      toast.error('Return failed', {
        description: error.message,
      })
    },
  })

  const totalReturnAmount = React.useMemo(() => {
    if (!saleDetails?.sale?.items) return 0
    let total = 0
    for (const item of saleDetails.sale.items) {
      const qty = returnItems[item.id] || 0
      total += item.mrp * qty
    }
    return total
  }, [saleDetails, returnItems])

  const returnItemCount = React.useMemo(() => {
    return Object.values(returnItems).filter((q) => q > 0).length
  }, [returnItems])

  const canSubmit = returnItemCount > 0 && returnReason.trim().length > 0

  return (
    <>
      {/* Trigger Button - inserted into billing page header area */}
      <div className="border-b bg-gradient-to-r from-rose-50/80 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/10">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 lg:px-4 py-2 hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <span className="text-sm font-semibold text-rose-800 dark:text-rose-300">
              Sales Returns
            </span>
            {recentSales && recentSales.sales.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                {recentSales.sales.length} recent
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="px-3 lg:px-4 pb-3">
            {/* Search within returns */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by invoice # or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-8 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : recentSales && recentSales.sales.length > 0 ? (
              <ScrollArea className="max-h-[40vh]">
                <div className="space-y-1.5">
                  {recentSales.sales
                    .filter((s) => !s.notes?.includes('RETURN'))
                    .slice(0, 10)
                    .map((sale) => (
                    <button
                      key={sale.id}
                      onClick={() => handleOpenReturn(sale)}
                      className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/30 transition-colors text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-medium text-muted-foreground">{sale.invoiceNo}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5">
                            {sale.paymentMode}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {sale.customer?.name || 'Walk-in'} • {sale.itemCount} items
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold">
                          {formatCurrency(sale.totalAmount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(sale.saleDate)}
                        </span>
                        <ArrowDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="py-4 text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? 'No matching invoices found' : 'No recent sales to return'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Return Dialog */}
      <Dialog open={open && !!selectedSale} onOpenChange={(o) => { if (!o) { setSelectedSale(null); setReturnItems({}); setReturnReason('') } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-rose-600" />
              Process Return
            </DialogTitle>
            <DialogDescription>
              Invoice #{selectedSale?.sale.invoiceNo} • {selectedSale?.sale.customer?.name || 'Walk-in customer'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Original sale info */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
              <span className="text-muted-foreground">Original Sale</span>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(selectedSale?.sale.totalAmount || 0)}</p>
                <p className="text-[10px] text-muted-foreground">{formatDateTime(selectedSale?.sale.saleDate || '')}</p>
              </div>
            </div>

            {/* Return items */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Select items to return</h4>
              {detailsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : saleDetails?.sale?.items && saleDetails.sale.items.length > 0 ? (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto rounded-lg border p-2">
                  {saleDetails.sale.items.map((item) => {
                    const currentQty = returnItems[item.id] ?? item.quantity
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center justify-between gap-3 p-2 rounded-lg border transition-colors',
                          currentQty > 0
                            ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                            : 'hover:bg-accent/30'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.medicineName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {item.batchNumber}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.mrp)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setReturnItems((prev) => {
                                const newQty = (prev[item.id] ?? item.quantity) - 1
                                if (newQty <= 0) {
                                  setReturnItems((prev) => {
                                    const next = { ...prev }
                                    delete next[item.id]
                                    return next
                                  })
                                } else {
                                  setReturnItems((prev) => ({ ...prev, [item.id]: newQty }))
                                }
                              })
                            }
                            disabled={currentQty <= 0}
                            className="h-7 w-7"
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
                              setReturnItems((prev) => ({
                                ...prev,
                                [item.id]: Math.min((prev[item.id] ?? 0) + 1, item.quantity),
                              }))
                            }
                            disabled={currentQty >= item.quantity}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No items found for this sale
                </div>
              )}
            </div>

            {/* Return reason */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </h4>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Damaged Product</SelectItem>
                  <SelectItem value="wrong_item">Wrong Item Delivered</SelectItem>
                  <SelectItem value="expired">Expired Medicine</SelectItem>
                  <SelectItem value="not_needed">Not Needed</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {returnReason === 'other' && (
                <Textarea
                  placeholder="Enter return reason..."
                  value={returnReason === 'other' ? (returnItems as Record<string, string>)['other'] || '' : ''}
                  onChange={(e) =>
                    setReturnItems((prev) => ({ ...prev, ['other']: e.target.value }))
                  }
                  className="h-20 resize-none text-sm"
                />
              )}
            </div>

            {/* Return summary */}
            {returnItemCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50/50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800">
                <div>
                  <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                    {returnItemCount} item{returnItemCount > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Refund: {formatCurrency(totalReturnAmount)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSelectedSale(null); setOpen(false) }} disabled={isSubmittingReturn}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => returnMutation.mutate()}
              disabled={!canSubmit || isSubmittingReturn}
            >
              {isSubmittingReturn && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Process Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
