'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  Truck,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building2,
  ShoppingCart,
  IndianRupee,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────────────────────────

interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  gstNumber: string | null
  createdAt: string
  totalOrders: number
  totalAmount: number
  lastOrderDate: string | null
}

interface SupplierForm {
  name: string
  phone: string
  email: string
  address: string
  gstNumber: string
}

interface PurchaseRecord {
  id: string
  invoiceNo: string | null
  invoiceDate: string
  totalAmount: number
  totalGst: number
  notes: string | null
  itemCount: number
  medicines: string[]
}

interface PurchaseHistoryData {
  supplier: { id: string; name: string; phone: string | null; email: string | null; address: string | null; gstNumber: string | null }
  purchases: PurchaseRecord[]
  total: number
  page: number
  limit: number
  summary: { totalSpent: number; totalGst: number; orderCount: number }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return format(parseISO(dateStr), 'dd MMM yyyy')
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '—'
  return format(parseISO(dateStr), 'dd MMM')
}

const emptyForm: SupplierForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
}

// ── Skeletons ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function SuppliersPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState<SupplierForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Debounce search
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch suppliers
  const { data, isLoading, error, refetch } = useQuery<{
    suppliers: Supplier[]
    total: number
    page: number
    limit: number
  }>({
    queryKey: ['suppliers', debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('page', page.toString())
      params.set('limit', '20')
      return fetch(`/api/suppliers?${params.toString()}`).then((r) => r.json())
    },
  })

  // Fetch purchase history for a supplier
  const [historyPage, setHistoryPage] = useState(1)
  const { data: historyData, isLoading: historyLoading } = useQuery<PurchaseHistoryData>({
    queryKey: ['supplier-history', selectedSupplier?.id, historyPage],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('page', historyPage.toString())
      params.set('limit', '20')
      return fetch(`/api/suppliers/${selectedSupplier!.id}/purchases?${params.toString()}`).then((r) => r.json())
    },
    enabled: !!selectedSupplier && historyDialogOpen,
  })

  // Create supplier
  const createMutation = useMutation({
    mutationFn: (data: SupplierForm) =>
      fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier created successfully')
      setAddDialogOpen(false)
      resetForm()
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error || 'Failed to create supplier')
    },
  })

  // Update supplier
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupplierForm }) =>
      fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier updated successfully')
      setEditDialogOpen(false)
      setSelectedSupplier(null)
      resetForm()
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error || 'Failed to update supplier')
    },
  })

  // Delete supplier
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/suppliers/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedSupplier(null)
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error || 'Failed to delete supplier')
    },
  })

  // Form helpers
  function resetForm() {
    setFormData(emptyForm)
    setFormErrors({})
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleFieldChange(field: keyof SupplierForm, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function openAddDialog() {
    resetForm()
    setAddDialogOpen(true)
  }

  function openEditDialog(supplier: Supplier) {
    setSelectedSupplier(supplier)
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
    })
    setFormErrors({})
    setEditDialogOpen(true)
  }

  function openDeleteDialog(supplier: Supplier) {
    setSelectedSupplier(supplier)
    setDeleteDialogOpen(true)
  }

  function openHistoryDialog(supplier: Supplier) {
    setSelectedSupplier(supplier)
    setHistoryPage(1)
    setHistoryDialogOpen(true)
  }

  const suppliers = data?.suppliers ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)
  const totalSpent = suppliers.reduce((sum, s) => sum + s.totalAmount, 0)

  return (
    <div className="page-enter p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Suppliers</h2>
          <p className="text-sm text-muted-foreground">
            Manage supplier records and purchase history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button onClick={openAddDialog} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Suppliers</p>
                  <p className="text-xl lg:text-2xl font-bold tracking-tight text-teal-600 dark:text-teal-400">{total}</p>
                </div>
                <div className="flex items-center justify-center rounded-xl p-2.5 bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 opacity-40" />
          </Card>
          <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Spent</p>
                  <p className="text-xl lg:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{formatCurrency(totalSpent)}</p>
                </div>
                <div className="flex items-center justify-center rounded-xl p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 opacity-40" />
          </Card>
          <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 col-span-2 md:col-span-1">
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Purchase Orders</p>
                  <p className="text-xl lg:text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
                    {suppliers.reduce((sum, s) => sum + s.totalOrders, 0)}
                  </p>
                </div>
                <div className="flex items-center justify-center rounded-xl p-2.5 bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400 shrink-0">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 opacity-40" />
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers by name, phone, email, GST..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearch('')}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Supplier List
          </CardTitle>
          <CardDescription>
            {debouncedSearch
              ? `Showing results for "${debouncedSearch}"`
              : `${total} supplier${total !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="px-6"><TableSkeleton /></div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-destructive mb-2">Failed to load suppliers.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try Again</Button>
            </div>
          ) : suppliers.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Supplier</TableHead>
                      <TableHead className="hidden lg:table-cell">Phone</TableHead>
                      <TableHead className="hidden xl:table-cell">GST Number</TableHead>
                      <TableHead className="text-right">Total Orders</TableHead>
                      <TableHead className="hidden lg:table-cell text-right">Total Spent</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Order</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id} className="table-row-hover hover:bg-muted/50">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 shrink-0">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{supplier.name}</p>
                              {supplier.email && (
                                <p className="text-xs text-muted-foreground truncate">{supplier.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {supplier.phone || '—'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-muted-foreground font-mono">
                          {supplier.gstNumber || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {supplier.totalOrders} order{supplier.totalOrders !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right font-semibold text-sm">
                          {formatCurrency(supplier.totalAmount)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDateShort(supplier.lastOrderDate)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openHistoryDialog(supplier)} title="View purchases">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditDialog(supplier)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(supplier)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden px-4 pb-4 space-y-2">
                {suppliers.map((supplier) => (
                  <Card key={supplier.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openHistoryDialog(supplier)}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 shrink-0">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{supplier.name}</p>
                            <p className="text-xs text-muted-foreground">{supplier.phone || 'No phone'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(supplier)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(supplier)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        <Badge variant="secondary" className="text-xs">
                          {supplier.totalOrders} order{supplier.totalOrders !== 1 ? 's' : ''}
                        </Badge>
                        <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(supplier.totalAmount)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} ({total} suppliers)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} className="h-8 w-8 p-0">
                      <ChevronLeft className="h-4 w-4" />
                      <ChevronLeft className="h-4 w-4 -ml-1" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-8 w-8 p-0">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="h-8 w-8 p-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-8 w-8 p-0">
                      <ChevronRight className="h-4 w-4" />
                      <ChevronRight className="h-4 w-4 -ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="rounded-full bg-teal-50 p-4 dark:bg-teal-950/50 mb-3">
                <Truck className="h-8 w-8 text-teal-500" />
              </div>
              <p className="font-medium text-sm">No suppliers found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {debouncedSearch
                  ? `No suppliers match "${debouncedSearch}". Try a different search term.`
                  : 'Start by adding your first supplier to track purchase orders.'}
              </p>
              {!debouncedSearch && (
                <Button size="sm" className="mt-4 gap-2" onClick={openAddDialog}>
                  <Plus className="h-4 w-4" />
                  Add Supplier
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Supplier Dialog ──────────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) { setAddDialogOpen(false); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />Add Supplier</DialogTitle>
            <DialogDescription>Add a new supplier to your pharmacy records.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Supplier name" value={formData.name} onChange={(e) => handleFieldChange('name', e.target.value)} autoFocus />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input placeholder="Phone number" value={formData.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="Email address" value={formData.email} onChange={(e) => handleFieldChange('email', e.target.value)} />
                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>GST Number</Label>
              <Input placeholder="GST number (e.g., 29AABCH1234A1Z5)" value={formData.gstNumber} onChange={(e) => handleFieldChange('gstNumber', e.target.value)} className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input placeholder="Supplier address" value={formData.address} onChange={(e) => handleFieldChange('address', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm() }}>Cancel</Button>
            <Button onClick={() => { if (validateForm()) createMutation.mutate(formData) }} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving...</> : <><Plus className="h-4 w-4" />Add Supplier</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Supplier Dialog ─────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setSelectedSupplier(null); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" />Edit Supplier</DialogTitle>
            <DialogDescription>Update supplier information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Supplier name" value={formData.name} onChange={(e) => handleFieldChange('name', e.target.value)} autoFocus />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input placeholder="Phone number" value={formData.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="Email address" value={formData.email} onChange={(e) => handleFieldChange('email', e.target.value)} />
                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>GST Number</Label>
              <Input placeholder="GST number" value={formData.gstNumber} onChange={(e) => handleFieldChange('gstNumber', e.target.value)} className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input placeholder="Supplier address" value={formData.address} onChange={(e) => handleFieldChange('address', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedSupplier(null); resetForm() }}>Cancel</Button>
            <Button onClick={() => { if (selectedSupplier && validateForm()) updateMutation.mutate({ id: selectedSupplier.id, data: formData }) }} disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving...</> : <><Pencil className="h-4 w-4" />Update Supplier</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Purchase History Dialog ──────────────────────────────────────── */}
      <Dialog open={historyDialogOpen} onOpenChange={(open) => { if (!open) { setHistoryDialogOpen(false); setSelectedSupplier(null) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Purchase History</DialogTitle>
            <DialogDescription>Orders from {selectedSupplier?.name}</DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <>
              {/* Supplier Info */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">{selectedSupplier.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {selectedSupplier.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedSupplier.phone}</span>}
                      {selectedSupplier.gstNumber && <span className="font-mono">GST: {selectedSupplier.gstNumber}</span>}
                    </div>
                  </div>
                </div>
                {historyData && (
                  <div className="flex items-center gap-4 pt-1 border-t">
                    <div className="flex items-center gap-1.5">
                      <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(historyData.summary.totalSpent)}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {historyData.summary.orderCount} orders
                    </Badge>
                  </div>
                )}
              </div>

              {/* Purchases List */}
              <div className="flex-1 min-h-0">
                {historyLoading ? (
                  <div className="space-y-2 py-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : historyData && historyData.purchases.length > 0 ? (
                  <ScrollArea className="scroll-container max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Medicines</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyData.purchases.map((po) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-mono text-xs font-medium">{po.invoiceNo || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(po.invoiceDate)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{po.medicines.join(', ')}</TableCell>
                            <TableCell className="text-right font-semibold text-sm">{formatCurrency(po.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {historyData.total > 20 && (
                      <div className="flex items-center justify-center gap-2 pt-3">
                        <Button variant="outline" size="sm" disabled={historyPage <= 1} onClick={() => setHistoryPage(historyPage - 1)} className="h-8 gap-1">
                          <ChevronLeft className="h-3.5 w-3.5" />Prev
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Page {historyPage} of {Math.ceil(historyData.total / 20)}
                        </span>
                        <Button variant="outline" size="sm" disabled={historyPage >= Math.ceil(historyData.total / 20)} onClick={() => setHistoryPage(historyPage + 1)} className="h-8 gap-1">
                          Next<ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-6 w-6 mb-2 opacity-30" />
                    <p className="text-sm">No purchase orders yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedSupplier?.name}</strong>? Purchase history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedSupplier && deleteMutation.mutate(selectedSupplier.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
