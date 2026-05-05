'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Printer,
  FileText,
  X,
  User,
  Stethoscope,
  Receipt,
  AlertTriangle,
  Clock,
  Package,
  RotateCcw,
  Check,
  Loader2,
  ArrowRight,
  Zap,
  ChevronDown,
  Camera,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { PrescriptionScanner, type ScannedMedicine } from '@/components/features/prescription-scanner'

// ==================== Types ====================

interface BatchInfo {
  id: string
  batchNumber: string
  qty: number
  purchasePrice: number
  mrp: number
  expiryDate: string
}

interface MedicineSearchResult {
  id: string
  name: string
  genericName?: string
  companyName?: string
  composition?: string
  strength?: string
  unitType: string
  packSize?: string
  gstPercent: number
  totalStock: number
  nearestExpiry: string
  category?: string
  batches: BatchInfo[]
}

interface CustomerInfo {
  id: string
  name: string
  phone?: string
  doctorName?: string
}

interface CartItem {
  id: string // unique cart item key
  medicineId: string
  medicineName: string
  batchId: string
  batchNumber: string
  expiryDate: string
  mrp: number
  gstPercent: number
  quantity: number
  maxQty: number
  discount: number
}

interface CompletedSale {
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
  customer?: {
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

type PaymentMode = 'cash' | 'card' | 'upi' | 'credit'

// ==================== Helpers ====================

function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })
}

function getExpiryStatus(expiryDate: string): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  colorClass: string
} {
  const now = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: 'Expired', variant: 'destructive', colorClass: 'bg-red-100 text-red-700 border-red-300' }
  } else if (diffDays <= 30) {
    return { label: `${diffDays}d left`, variant: 'destructive', colorClass: 'bg-amber-100 text-amber-700 border-amber-300' }
  } else if (diffDays <= 90) {
    return { label: `${diffDays}d left`, variant: 'secondary', colorClass: 'bg-yellow-50 text-yellow-600 border-yellow-200' }
  }
  return { label: formatDate(expiryDate), variant: 'outline', colorClass: 'bg-green-50 text-green-600 border-green-200' }
}

function generateCartItemId(): string {
  return `ci_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// ==================== Component ====================

// ==================== Quick Sale Types ====================

interface QuickSaleMedicine {
  id: string
  name: string
  composition: string | null
  strength: string | null
  unitType: string
  mrp: number
  totalStock: number
  quantitySold: number
}

// ==================== Component ====================

export function BillingPage() {
  // Quick Sale state
  const [quickSaleOpen, setQuickSaleOpen] = useState(true)

  // Quick Sale query
  const { data: quickSaleData, isLoading: quickSaleLoading } = useQuery<{ medicines: QuickSaleMedicine[] }>({
    queryKey: ['quick-sale-medicines'],
    queryFn: () => fetch('/api/billing/quick-sale').then((r) => r.json()),
    refetchInterval: 60000,
  })

  const quickSaleMedicines = quickSaleData?.medicines ?? []

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MedicineSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // Customer state
  const [customers, setCustomers] = useState<CustomerInfo[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null)
  const [doctorName, setDoctorName] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerRef = useRef<HTMLDivElement>(null)

  // Payment
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')

  // Dialogs
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [isCompletingSale, setIsCompletingSale] = useState(false)
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)
  const [showScanDialog, setShowScanDialog] = useState(false)

  // Mobile
  const [mobileView, setMobileView] = useState<'search' | 'cart'>('search')

  // Recently searched medicines (localStorage)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showRecentSearches, setShowRecentSearches] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pharmpos-recent-searches')
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {}
  }, [])

  const addRecentSearch = useCallback((medicineName: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((n) => n !== medicineName)
      const updated = [medicineName, ...filtered].slice(0, 3)
      try { localStorage.setItem('pharmpos-recent-searches', JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    try { localStorage.removeItem('pharmpos-recent-searches') } catch {}
  }, [])

  // Consume pending search query from header
  const { pendingSearchQuery, setPendingSearchQuery } = useAppStore()
  useEffect(() => {
    if (pendingSearchQuery) {
      setSearchQuery(pendingSearchQuery)
      setPendingSearchQuery('')
      // Trigger search immediately
      const q = pendingSearchQuery
      fetch(`/api/medicines?search=${encodeURIComponent(q)}&limit=5`)
        .then((res) => res.json())
        .then((data) => {
          setSearchResults(data.medicines || [])
          setShowSearchDropdown(true)
        })
        .catch(() => {})
      searchInputRef.current?.focus()
    }
  }, [pendingSearchQuery, setPendingSearchQuery])

  // Load customers
  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Focus search on mount
  useEffect(() => {
    const timer = setTimeout(() => searchInputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // F2 = New Bill
      if (e.key === 'F2') {
        e.preventDefault()
        clearCart()
      }
      // F4 = Focus Search
      if (e.key === 'F4') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // F8 = Complete Sale
      if (e.key === 'F8') {
        e.preventDefault()
        if (cartItems.length > 0) {
          setShowConfirmDialog(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cartItems])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false)
      }
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search medicines
  const searchMedicines = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/billing/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
      setShowSearchDropdown(true)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = setTimeout(() => searchMedicines(value), 250)
    },
    [searchMedicines]
  )

  // Show recent searches when input is focused and empty
  useEffect(() => {
    if (searchQuery.length < 2 && !isSearching) {
      setShowRecentSearches(true)
    } else {
      setShowRecentSearches(false)
    }
  }, [searchQuery, isSearching])

  // Add medicine to cart (FIFO: first batch = nearest expiry)
  const addToCart = useCallback(
    (medicine: MedicineSearchResult) => {
      const firstBatch = medicine.batches[0] // Already sorted by nearest expiry
      if (!firstBatch) return

      // Track recent search
      addRecentSearch(medicine.name)

      // Check if same batch already in cart
      const existingIdx = cartItems.findIndex((item) => item.batchId === firstBatch.id)

      if (existingIdx >= 0) {
        const existing = cartItems[existingIdx]
        if (existing.quantity < existing.maxQty) {
          setCartItems((prev) =>
            prev.map((item, i) =>
              i === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
            )
          )
        }
      } else {
        const newItem: CartItem = {
          id: generateCartItemId(),
          medicineId: medicine.id,
          medicineName: medicine.name,
          batchId: firstBatch.id,
          batchNumber: firstBatch.batchNumber,
          expiryDate: firstBatch.expiryDate,
          mrp: firstBatch.mrp,
          gstPercent: medicine.gstPercent,
          quantity: 1,
          maxQty: firstBatch.qty,
          discount: 0,
        }
        setCartItems((prev) => [...prev, newItem])
      }

      // Reset search and refocus
      setSearchQuery('')
      setSearchResults([])
      setShowSearchDropdown(false)
      searchInputRef.current?.focus()
    },
    [cartItems]
  )

  // Update cart item quantity
  const updateQuantity = useCallback((cartItemId: string, newQty: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === cartItemId
          ? { ...item, quantity: Math.max(1, Math.min(newQty, item.maxQty)) }
          : item
      )
    )
  }, [])

  // Update cart item discount
  const updateDiscount = useCallback((cartItemId: string, discount: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === cartItemId ? { ...item, discount: Math.max(0, Math.min(discount, 100)) } : item
      )
    )
  }, [])

  // Remove cart item
  const removeCartItem = useCallback((cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartItemId))
  }, [])

  // Clear cart
  const clearCart = useCallback(() => {
    setCartItems([])
    setSelectedCustomer(null)
    setCustomerQuery('')
    setDoctorName('')
    setPaymentMode('cash')
    setCompletedSale(null)
    setShowInvoiceDialog(false)
    searchInputRef.current?.focus()
  }, [])

  // Cart calculations
  const cartSummary = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.mrp * item.quantity, 0)
    const totalDiscount = cartItems.reduce(
      (sum, item) => sum + item.mrp * item.quantity * (item.discount / 100),
      0
    )
    const totalGst = cartItems.reduce((sum, item) => {
      const basePrice = item.mrp * 100 / (100 + item.gstPercent)
      const gstPerUnit = item.mrp - basePrice
      return sum + gstPerUnit * item.quantity
    }, 0)
    const grandTotal = subtotal - totalDiscount
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      itemCount,
    }
  }, [cartItems])

  // Complete sale
  const completeSale = useCallback(async () => {
    if (cartItems.length === 0) return

    setIsCompletingSale(true)
    try {
      const body = {
        customerId: selectedCustomer?.id || null,
        doctorName: doctorName || null,
        paymentMode,
        items: cartItems.map((item) => ({
          batchId: item.batchId,
          quantity: item.quantity,
          discount: item.discount,
          mrp: item.mrp,
        })),
      }

      const res = await fetch('/api/billing/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to complete sale')
        return
      }

      setCompletedSale(data)
      setShowConfirmDialog(false)
      setShowInvoiceDialog(true)
      setCartItems([])
    } catch {
      alert('Failed to complete sale. Please try again.')
    } finally {
      setIsCompletingSale(false)
    }
  }, [cartItems, selectedCustomer, doctorName, paymentMode])

  // Print invoice
  const printInvoice = useCallback(() => {
    const printContent = document.getElementById('invoice-print-area')
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${completedSale?.invoiceNo}</title>
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
  }, [completedSale])

  // Handle results from prescription scanner
  const handleScanResults = useCallback(
    async (result: any) => {
      // 1. Populate Doctor Name
      if (result.doctor_name) {
        setDoctorName(result.doctor_name)
      }

      // 2. Populate Patient Name if possible
      if (result.patient_name && !selectedCustomer) {
        setCustomerQuery(result.patient_name)
      }

      // 3. Add medicines to cart
      const medicines = result.medicines || []
      for (const med of medicines) {
        try {
          const res = await fetch(`/api/billing/search?q=${encodeURIComponent(med.name)}`)
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            addToCart(data[0])
          } else {
            toast.warning(`"${med.name}" not found in inventory`)
          }
        } catch {
          toast.error(`Error searching for "${med.name}"`)
        }
      }
    },
    [addToCart, selectedCustomer]
  )

  // Customer filtered
  const filteredCustomers = useMemo(() => {
    if (!customerQuery) return customers
    const q = customerQuery.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    )
  }, [customers, customerQuery])

  // Recently used (from completedSale or keep last cart items)
  const recentItems = useMemo(() => {
    if (completedSale) {
      return completedSale.items.slice(0, 5).map((item) => ({
        name: item.medicineName,
        batchNumber: item.batch.batchNumber,
      }))
    }
    return []
  }, [completedSale])

  const paymentModes: { value: PaymentMode; label: string; icon: React.ReactNode }[] = [
    { value: 'cash', label: 'Cash', icon: <Receipt className="h-3.5 w-3.5" /> },
    { value: 'card', label: 'Card', icon: <FileText className="h-3.5 w-3.5" /> },
    { value: 'upi', label: 'UPI', icon: <Package className="h-3.5 w-3.5" /> },
    { value: 'credit', label: 'Credit', icon: <Clock className="h-3.5 w-3.5" /> },
  ]

  // ==================== RENDER ====================

  return (
    <div className="h-full flex flex-col lg:flex-row gap-0">
      {/* ==================== LEFT PANEL: Search ==================== */}
      <div className="flex-1 lg:w-[60%] flex flex-col min-h-0 border-r">
        {/* Past Invoices Search Section */}
        <PastInvoicesSection completedSale={completedSale} setShowInvoiceDialog={setShowInvoiceDialog} />

        {/* Quick Sale Section */}
        <div className="border-b bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10">
          <button
            onClick={() => setQuickSaleOpen(!quickSaleOpen)}
            className="w-full flex items-center justify-between px-3 lg:px-4 py-2 hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Quick Sale
              </span>
              {quickSaleMedicines.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  Top {quickSaleMedicines.length}
                </Badge>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${quickSaleOpen ? 'rotate-180' : ''}`} />
          </button>

          {quickSaleOpen && (
            <div className="px-3 lg:px-4 pb-3">
              {quickSaleLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="relative rounded-xl border bg-card p-2.5 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer -translate-x-full" />
                      <Skeleton className="h-3.5 w-20 mb-1.5" />
                      <Skeleton className="h-2.5 w-16 mb-2" />
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : quickSaleMedicines.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {quickSaleMedicines.map((med) => (
                    <button
                      key={med.id}
                      onClick={() => {
                        // Build a minimal MedicineSearchResult from QuickSale data and add to cart
                        const fakeMed: MedicineSearchResult = {
                          id: med.id,
                          name: med.name,
                          composition: med.composition || undefined,
                          strength: med.strength || undefined,
                          unitType: med.unitType,
                          gstPercent: 5,
                          totalStock: med.totalStock,
                          nearestExpiry: '',
                          batches: [{
                            id: '',
                            batchNumber: '',
                            qty: med.totalStock,
                            purchasePrice: 0,
                            mrp: med.mrp,
                            expiryDate: '',
                          }],
                        }
                        // Fetch real billing search data for this medicine to get proper batch info
                        fetch(`/api/billing/search?q=${encodeURIComponent(med.name)}&exact=true`)
                          .then((res) => res.json())
                          .then((data) => {
                            if (Array.isArray(data) && data.length > 0) {
                              addToCart(data[0])
                            }
                          })
                          .catch(() => {})
                      }}
                      disabled={med.totalStock === 0}
                      className="action-card-hover rounded-xl border bg-card p-2.5 text-left hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                        {med.name}
                      </p>
                      {med.composition && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {med.composition.length > 30 ? med.composition.substring(0, 30) + '...' : med.composition}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          ₹{med.mrp.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-medium ${med.totalStock < 10 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                          {med.totalStock} in stock
                        </span>
                      </div>
                      {med.quantitySold > 0 && (
                        <div className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5 text-amber-500" />
                          {med.quantitySold} sold
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3 text-xs text-muted-foreground">
                  No sales data yet. Start billing to see top medicines here.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Header */}
        <div className="p-3 lg:p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-semibold tracking-tight">New Bill</h2>
            <div className="hidden sm:flex items-center gap-1 ml-auto text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono">F4</kbd>
              <span>Search</span>
              <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono ml-2">F8</kbd>
              <span>Sale</span>
              <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono ml-2">F2</kbd>
              <span>New</span>
            </div>
          </div>

          {/* Search Input */}
          <div ref={searchRef} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search medicine by name, composition, or generic..."
              className="input-focus-smooth focus-teal h-11 pl-10 pr-20 text-base lg:text-sm"
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchDropdown(true)
              }}
            />
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                  setShowSearchDropdown(false)
                  searchInputRef.current?.focus()
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-12 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setShowScanDialog(true)}
                title="Scan Prescription"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowScanDialog(true)}
              title="Scan Prescription / Bill"
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
            {showSearchDropdown && (isSearching || searchResults.length > 0) && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background/95 backdrop-blur-sm border border-border/80 rounded-xl shadow-xl shadow-black/5 max-h-[50vh] overflow-hidden animate-slide-in">
                {isSearching ? (
                  <div className="p-4">
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-3/4" />
                  </div>
                ) : (
                  <ScrollArea className="scroll-container max-h-[50vh]">
                    {searchResults.map((med) => (
                      <button
                        key={med.id}
                        onClick={() => addToCart(med)}
                        className="w-full text-left p-3 hover:bg-primary/5 border-b border-border/50 last:border-b-0 transition-all duration-150"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium text-sm truncate">{med.name}</p>
                              {med.category && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 shrink-0 capitalize">
                                  {med.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {med.composition}
                              {med.strength ? ` • ${med.strength}` : ''}
                            </p>
                            {med.genericName && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                Generic: {med.genericName}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-sm">{formatCurrency(med.batches[0]?.mrp || 0)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {med.totalStock} in stock
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {med.companyName}
                            </p>
                          </div>
                        </div>
                        {/* First batch (FIFO) info */}
                        {med.batches[0] && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              Batch: {med.batches[0].batchNumber}
                            </span>
                            <Badge
                              className={`text-[9px] px-1.5 py-0 ${getExpiryStatus(med.batches[0].expiryDate).colorClass}`}
                            >
                              {getExpiryStatus(med.batches[0].expiryDate).label}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              Qty: {med.batches[0].qty}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                    {!isSearching && searchResults.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No medicines found
                      </div>
                    )}
                  </ScrollArea>
                )}
              </div>
            )}
            {/* Recent Searches Dropdown */}
            {showRecentSearches && recentSearches.length > 0 && !showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background/95 backdrop-blur-sm border border-border/80 rounded-xl shadow-xl shadow-black/5 overflow-hidden animate-slide-in">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-gradient-to-r from-muted/40 to-transparent">
                  <span className="text-[11px] font-medium text-muted-foreground">Recently Searched</span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Clear recent searches"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {recentSearches.map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      setSearchQuery(name)
                      searchMedicines(name)
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-primary/5 border-b border-border/50 last:border-b-0 transition-all duration-150"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                      <span className="text-sm truncate">{name}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40 ml-auto shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Add / Recent */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-4">
          {cartItems.length === 0 && searchQuery.length < 2 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground mb-1">Start a New Bill</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Search for medicines using the search bar above. Press <kbd className="px-1 py-0.5 rounded border bg-muted font-mono text-xs">F4</kbd> to focus search.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="p-3 rounded-lg border bg-card">
                  <kbd className="px-1 py-0.5 rounded border bg-muted font-mono">F2</kbd>
                  <span className="ml-1">New Bill</span>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <kbd className="px-1 py-0.5 rounded border bg-muted font-mono">F4</kbd>
                  <span className="ml-1">Search</span>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <kbd className="px-1 py-0.5 rounded border bg-muted font-mono">F8</kbd>
                  <span className="ml-1">Complete Sale</span>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <span>Auto FIFO</span>
                  <span className="ml-1">batch selection</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Cart Items List (Left panel on desktop shows a condensed view) */}
              <div className="hidden lg:block">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">
                    Cart Items ({cartSummary.itemCount})
                  </h3>
                  {cartItems.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground h-7">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {cartItems.map((item) => {
                    const expiryInfo = getExpiryStatus(item.expiryDate)
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-primary/[0.03] transition-all duration-200 hover:shadow-sm",
                          item.discount > 0 && "border-l-2 border-l-amber-400/60 dark:border-l-amber-500/60"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{item.medicineName}</p>
                            <Badge className={`text-[9px] px-1.5 py-0 shrink-0 ${expiryInfo.colorClass}`}>
                              {expiryInfo.label}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Batch: {item.batchNumber} • MRP: {formatCurrency(item.mrp)} • GST: {item.gstPercent}%
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.maxQty}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right w-20 shrink-0">
                          <p className="font-semibold text-sm">
                            {formatCurrency(item.mrp * item.quantity * (1 - item.discount / 100))}
                          </p>
                          {item.discount > 0 && (
                            <p className="text-[10px] text-muted-foreground line-through">
                              {formatCurrency(item.mrp * item.quantity)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeCartItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Bar */}
        <div className="lg:hidden border-t p-3 bg-background">
          {cartItems.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{cartSummary.itemCount} items</p>
                <p className="font-bold text-lg">{formatCurrency(cartSummary.grandTotal)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileView(mobileView === 'cart' ? 'search' : 'cart')}
                className="shrink-0"
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                {mobileView === 'cart' ? 'Search' : 'Cart'}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Check className="h-4 w-4 mr-1" />
                Pay
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Cart View */}
        {mobileView === 'cart' && (
          <Drawer open={true} onOpenChange={(open) => !open && setMobileView('search')}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Cart ({cartSummary.itemCount} items)</DrawerTitle>
                <DrawerDescription>Review and manage items before checkout</DrawerDescription>
              </DrawerHeader>
              <ScrollArea className="scroll-container max-h-[60vh] px-4">
                {cartItems.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onUpdateQty={updateQuantity}
                    onUpdateDiscount={updateDiscount}
                    onRemove={removeCartItem}
                  />
                ))}
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-xl">{formatCurrency(cartSummary.grandTotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={clearCart}>
                    Clear Cart
                  </Button>
                  <Button
                    onClick={() => {
                      setMobileView('search')
                      setShowConfirmDialog(true)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    Complete Sale
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </div>

      {/* ==================== RIGHT PANEL: Cart & Invoice ==================== */}
      <div className="hidden lg:flex w-[40%] flex-col min-h-0 bg-muted/30">
        <ScrollArea className="scroll-container flex-1">
          <div className="p-4 space-y-4">
            {/* Customer Section */}
            <div className="rounded-lg border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Customer
                </h3>
                {selectedCustomer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-muted-foreground"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setCustomerQuery('')
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Customer Search */}
              <div ref={customerRef} className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                {selectedCustomer ? (
                  <div className="flex items-center gap-2 h-9 pl-8 pr-3 rounded-md border bg-muted/50">
                    <span className="text-sm font-medium flex-1">{selectedCustomer.name}</span>
                    {selectedCustomer.phone && (
                      <span className="text-xs text-muted-foreground">{selectedCustomer.phone}</span>
                    )}
                  </div>
                ) : (
                  <>
                    <Input
                      value={customerQuery}
                      onChange={(e) => {
                        setCustomerQuery(e.target.value)
                        setShowCustomerDropdown(true)
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search customer or type new name..."
                      className="input-focus-smooth focus-teal h-9 pl-8 text-sm"
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-40 overflow-auto">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomer(c)
                              setCustomerQuery('')
                              setShowCustomerDropdown(false)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm border-b last:border-b-0"
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.phone && (
                              <span className="text-muted-foreground ml-2">{c.phone}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Doctor Name */}
              <div className="relative">
                <Stethoscope className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Doctor name (optional)"
                  className="input-focus-smooth focus-teal h-9 pl-8 text-sm"
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Payment Mode</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {paymentModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setPaymentMode(mode.value)}
                      className={`flex items-center justify-center gap-1 h-8 rounded-md border text-xs font-medium transition-colors ${
                        paymentMode === mode.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-accent border-input'
                      }`}
                    >
                      {mode.icon}
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cart Items */}
            <div className="card-elevated rounded-lg border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Cart ({cartSummary.itemCount})
                </h3>
                {cartItems.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground h-6 text-xs">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Cart is empty</p>
                  <p className="text-xs mt-1">Search and add medicines to start billing</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {cartItems.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onUpdateQty={updateQuantity}
                      onUpdateDiscount={updateDiscount}
                      onRemove={removeCartItem}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Summary & Actions - Sticky bottom */}
        <div className="border-t bg-gradient-to-b from-background to-muted/20 p-4 space-y-3 shadow-[0_-4px_12px_-4px_oklch(0_0_0/0.04)] dark:shadow-[0_-4px_12px_-4px_oklch(0_0_0/0.2)]">
          {/* Summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(cartSummary.subtotal)}</span>
            </div>
            {cartSummary.totalDiscount > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Discount</span>
                <span>-{formatCurrency(cartSummary.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Incl. GST</span>
              <span>{formatCurrency(cartSummary.totalGst)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-semibold text-base">Grand Total</span>
              <span className="font-bold text-2xl">{formatCurrency(cartSummary.grandTotal)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearCart} className="flex-1 h-11">
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={cartItems.length === 0}
              className="btn-gradient-emerald btn-glow flex-1 h-11 font-semibold text-base"
            >
              <Check className="h-4 w-4 mr-2" />
              Complete Sale
            </Button>
          </div>

          {/* Print button after sale */}
          {completedSale && (
            <Button
              variant="outline"
              onClick={() => setShowInvoiceDialog(true)}
              className="w-full h-9"
            >
              <Printer className="h-3.5 w-3.5 mr-2" />
              Reprint Invoice {completedSale.invoiceNo}
            </Button>
          )}
        </div>
      </div>

      {/* ==================== CONFIRM SALE DIALOG ==================== */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Sale</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2 text-sm mt-2">
                <div className="flex justify-between">
                  <span>Items</span>
                  <span className="font-medium">{cartSummary.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartSummary.subtotal)}</span>
                </div>
                {cartSummary.totalDiscount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(cartSummary.totalDiscount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(cartSummary.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Payment</span>
                  <span className="capitalize">{paymentMode}</span>
                </div>
                {selectedCustomer && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Customer</span>
                    <span>{selectedCustomer.name}</span>
                  </div>
                )}
                {doctorName && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Doctor</span>
                    <span>{doctorName}</span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompletingSale}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={completeSale}
              disabled={isCompletingSale}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isCompletingSale && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isCompletingSale ? 'Processing...' : 'Confirm & Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== PRESCRIPTION SCANNER DIALOG ==================== */}
      <PrescriptionScanner
        open={showScanDialog}
        onOpenChange={setShowScanDialog}
        onScanComplete={handleScanResults}
      />

      {/* ==================== INVOICE DIALOG ==================== */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30">
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice</DialogTitle>
            <DialogDescription>Sale invoice preview</DialogDescription>
          </DialogHeader>

          {completedSale && (
            <>
              {/* Invoice Print Area */}
              <div id="invoice-print-area" className="p-6 sm:p-8">
                <InvoiceContent sale={completedSale} />
              </div>

              <DialogFooter className="flex-row gap-2 sm:justify-center border-t border-border/50 bg-muted/20 p-4 rounded-b-2xl">
                <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
                  Close
                </Button>
                <Button
                  onClick={printInvoice}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Invoice
                </Button>
                <Button onClick={clearCart}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Bill
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== Cart Item Row Component ====================

function CartItemRow({
  item,
  onUpdateQty,
  onUpdateDiscount,
  onRemove,
}: {
  item: CartItem
  onUpdateQty: (id: string, qty: number) => void
  onUpdateDiscount: (id: string, disc: number) => void
  onRemove: (id: string) => void
}) {
  const expiryInfo = getExpiryStatus(item.expiryDate)
  const lineTotal = item.mrp * item.quantity * (1 - item.discount / 100)

  return (
    <div className="p-2.5 rounded-lg border text-sm space-y-1.5 bg-background animate-in fade-in-0 slide-in-from-bottom-1 duration-200 hover:bg-muted/30 transition-colors shadow-sm shadow-black/[0.02]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.medicineName}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="text-[11px] text-muted-foreground">Batch: {item.batchNumber}</span>
            <Badge className={`text-[9px] px-1 py-0 ${expiryInfo.colorClass}`}>
              {expiryInfo.label}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Quantity controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onUpdateQty(item.id, item.quantity - 1)}
          >
            <Minus className="h-2.5 w-2.5" />
          </Button>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1
              onUpdateQty(item.id, val)
            }}
            className="w-9 h-6 text-center text-xs border-y border-input bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onUpdateQty(item.id, item.quantity + 1)}
            disabled={item.quantity >= item.maxQty}
          >
            <Plus className="h-2.5 w-2.5" />
          </Button>
        </div>

        {/* Price info */}
        <div className="flex-1 text-right">
          <p className="font-semibold text-sm">{formatCurrency(lineTotal)}</p>
          <p className="text-[10px] text-muted-foreground">
            {formatCurrency(item.mrp)} × {item.quantity}
          </p>
        </div>

        {/* Discount */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Input
            type="number"
            value={item.discount || ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0
              onUpdateDiscount(item.id, val)
            }}
            placeholder="0"
            className="w-11 h-6 text-center text-[11px] px-1"
            min={0}
            max={100}
          />
          <span className="text-[10px] text-muted-foreground">%</span>
        </div>
      </div>

      {/* Stock warning */}
      {item.quantity >= item.maxQty && (
        <div className="flex items-center gap-1 text-[10px] text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          <span>Max available stock reached ({item.maxQty})</span>
        </div>
      )}
    </div>
  )
}

// ==================== Past Invoices Component ====================

interface InvoiceResult {
  id: string
  invoiceNo: string
  saleDate: string
  customerName: string
  totalAmount: number
  paymentMode: string
  itemCount: number
}

function PastInvoicesSection({
  completedSale,
  setShowInvoiceDialog,
}: {
  completedSale: CompletedSale | null
  setShowInvoiceDialog: (open: boolean) => void
}) {
  const [showPastInvoices, setShowPastInvoices] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [viewInvoiceNo, setViewInvoiceNo] = useState('')
  const [invoiceData, setInvoiceData] = useState<CompletedSale | null>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(false)

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{
    invoices: InvoiceResult[]
  }>({
    queryKey: ['past-invoices', invoiceSearch],
    queryFn: () =>
      fetch(`/api/billing/invoices?search=${encodeURIComponent(invoiceSearch)}&limit=20`).then((r) =>
        r.json()
      ),
    enabled: showPastInvoices,
  })

  const invoices = invoicesData?.invoices ?? []

  // Watch completedSale to refresh invoices
  const { data: latestInvoices } = useQuery<{
    invoices: InvoiceResult[]
  }>({
    queryKey: ['past-invoices-latest'],
    queryFn: () => fetch('/api/billing/invoices?limit=5').then((r) => r.json()),
    refetchInterval: 60000,
  })

  // View invoice handler
  const handleViewInvoice = useCallback(async (invoiceNo: string) => {
    setViewInvoiceNo(invoiceNo)
    setLoadingInvoice(true)
    try {
      const res = await fetch(`/api/billing/invoice/${invoiceNo}`)
      const data = await res.json()
      if (res.ok) {
        setInvoiceData(data)
        setShowInvoiceDialog(true)
      } else {
        toast.error('Failed to load invoice')
      }
    } catch {
      toast.error('Failed to load invoice')
    } finally {
      setLoadingInvoice(false)
    }
  }, [setShowInvoiceDialog])

  const paymentModeBadge = (mode: string) => {
    const map: Record<string, string> = {
      cash: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
      card: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
      upi: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
      credit: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    }
    return map[mode] || 'bg-muted text-muted-foreground'
  }

  return (
    <div>
      <button
        onClick={() => setShowPastInvoices(!showPastInvoices)}
        className="w-full flex items-center justify-between px-3 lg:px-4 py-2 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="text-sm font-semibold text-teal-800 dark:text-teal-300">
            Past Invoices
          </span>
          {latestInvoices && latestInvoices.invoices.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
              {latestInvoices.invoices.length} recent
            </Badge>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showPastInvoices ? 'rotate-180' : ''}`} />
      </button>

      {showPastInvoices && (
        <div className="px-3 lg:px-4 pb-3 border-b">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by invoice # or customer name..."
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
            {invoiceSearch && (
              <button
                onClick={() => setInvoiceSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Invoice Table */}
          {invoicesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : invoices.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-2 py-1.5 font-semibold">Invoice #</th>
                      <th className="text-left px-2 py-1.5 font-semibold hidden sm:table-cell">Date</th>
                      <th className="text-left px-2 py-1.5 font-semibold">Customer</th>
                      <th className="text-right px-2 py-1.5 font-semibold">Amount</th>
                      <th className="text-center px-2 py-1.5 font-semibold hidden sm:table-cell">Mode</th>
                      <th className="text-right px-2 py-1.5 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="px-2 py-1.5 font-mono font-medium">{inv.invoiceNo}</td>
                        <td className="px-2 py-1.5 text-muted-foreground hidden sm:table-cell">
                          {formatDate(inv.saleDate)}
                        </td>
                        <td className="px-2 py-1.5 font-medium">{inv.customerName}</td>
                        <td className="px-2 py-1.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="px-2 py-1.5 text-center hidden sm:table-cell">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${paymentModeBadge(inv.paymentMode)}`}>
                            {inv.paymentMode}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            onClick={() => handleViewInvoice(inv.invoiceNo)}
                            disabled={loadingInvoice}
                            className="text-primary hover:underline text-[11px] font-medium disabled:opacity-50"
                          >
                            {loadingInvoice && viewInvoiceNo === inv.invoiceNo ? 'Loading...' : 'View'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-muted-foreground">
              {invoiceSearch ? 'No invoices found matching your search' : 'No invoices recorded yet'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== Invoice Content Component ====================

function InvoiceContent({ sale }: { sale: CompletedSale }) {
  return (
    <div className="font-mono text-xs">
      {/* Store Header */}
      <div className="text-center mb-3">
        <p className="text-base font-bold">MediCare Pharmacy</p>
        <p className="text-[10px] text-gray-600">123, Health Street, City - 400001</p>
        <p className="text-[10px] text-gray-600">Ph: +91 98765 43210</p>
        <p className="text-[10px] text-gray-600">GSTIN: 27AAACR1234F1ZP</p>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Invoice Info */}
      <div className="flex justify-between mb-1">
        <span className="font-semibold">Invoice: {sale.invoiceNo}</span>
        <span>{new Date(sale.saleDate).toLocaleDateString('en-IN')}</span>
      </div>

      {/* Customer */}
      {sale.customer && (
        <div className="mb-1">
          <p className="text-[10px] text-gray-600">Customer: {sale.customer.name}</p>
          {sale.customer.phone && (
            <p className="text-[10px] text-gray-600">Ph: {sale.customer.phone}</p>
          )}
        </div>
      )}
      {sale.doctorName && (
        <p className="text-[10px] text-gray-600 mb-1">Dr. {sale.doctorName}</p>
      )}
      <p className="text-[10px] text-gray-600 mb-2">
        Payment: <span className="uppercase">{sale.paymentMode}</span>
      </p>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Items Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-400">
            <th className="text-left py-1 w-6">#</th>
            <th className="text-left py-1">Item</th>
            <th className="text-center py-1 w-8">Qty</th>
            <th className="text-right py-1 w-14">MRP</th>
            <th className="text-right py-1 w-8">D%</th>
            <th className="text-right py-1 w-16">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, idx) => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="py-1">{idx + 1}</td>
              <td className="py-1">
                <div className="font-medium">{item.medicineName}</div>
                <div className="text-[9px] text-gray-500">
                  {item.batch.batchNumber} • {formatDate(item.batch.expiryDate)}
                </div>
              </td>
              <td className="text-center py-1">{item.quantity}</td>
              <td className="text-right py-1">{item.mrp.toFixed(2)}</td>
              <td className="text-right py-1">{item.discount > 0 ? item.discount : '-'}</td>
              <td className="text-right py-1 font-medium">{item.totalAmount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Totals */}
      <div className="space-y-0.5 text-right">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.totalDiscount > 0 && (
          <div className="flex justify-between text-amber-600">
            <span>Discount</span>
            <span>-{formatCurrency(sale.totalDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-500">
          <span>GST (included in MRP)</span>
          <span>{formatCurrency(sale.totalGst)}</span>
        </div>
        <div className="border-t border-gray-400 pt-1 mt-1 flex justify-between font-bold text-sm">
          <span>TOTAL</span>
          <span>{formatCurrency(sale.totalAmount)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Amount in words approximation */}
      <div className="text-[10px] text-gray-500 mb-3">
        <p className="mb-1">Items: {sale.items.reduce((s, i) => s + i.quantity, 0)}</p>
      </div>

      {/* Thank You */}
      <div className="text-center mt-4">
        <p className="font-semibold text-sm">Thank You!</p>
        <p className="text-[10px] text-gray-500">Visit Again</p>
        <p className="text-[9px] text-gray-400 mt-1">Medicine once sold will not be taken back</p>
      </div>
    </div>
  )
}
