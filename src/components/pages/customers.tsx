'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  Calendar,
  IndianRupee,
  ShoppingCart,
  UserCircle,
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

// ── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  doctorName: string | null
  createdAt: string
  totalPurchases: number
  totalOrders: number
  lastVisit: string | null
}

interface PurchaseHistory {
  id: string
  invoiceNo: string
  saleDate: string
  totalAmount: number
  paymentMode: string
  itemCount: number
  items: Array<{
    medicineName: string
    quantity: number
    totalAmount: number
  }>
}

interface CustomerForm {
  name: string
  phone: string
  email: string
  address: string
  doctorName: string
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

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a')
}

const emptyForm: CustomerForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  doctorName: '',
}

// ── Skeletons ───────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24 ml-auto" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function CustomersPage() {
  const queryClient = useQueryClient()

  // Local state
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState<CustomerForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Debounce search
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch customers
  const {
    data: customers,
    isLoading,
    error,
    refetch,
  } = useQuery<Customer[]>({
    queryKey: ['customers', debouncedSearch],
    queryFn: () => {
      const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''
      return fetch(`/api/customers${params}`).then((r) => r.json())
    },
  })

  // Fetch purchase history for detail view
  const {
    data: purchaseHistory,
    isLoading: historyLoading,
  } = useQuery<PurchaseHistory[]>({
    queryKey: ['customer-history', selectedCustomer?.id],
    queryFn: () =>
      fetch(`/api/customers/${selectedCustomer!.id}/history`).then((r) => r.json()),
    enabled: !!selectedCustomer && detailDialogOpen,
  })

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: (data: CustomerForm) =>
      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer created successfully')
      setAddDialogOpen(false)
      resetForm()
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error || 'Failed to create customer')
    },
  })

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerForm }) =>
      fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer updated successfully')
      setEditDialogOpen(false)
      setSelectedCustomer(null)
      resetForm()
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error || 'Failed to update customer')
    },
  })

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/customers/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedCustomer(null)
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error || 'Failed to delete customer')
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

  function handleFieldChange(field: keyof CustomerForm, value: string) {
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

  function openEditDialog(customer: Customer) {
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      doctorName: customer.doctorName || '',
    })
    setFormErrors({})
    setEditDialogOpen(true)
  }

  function openDetailDialog(customer: Customer) {
    setSelectedCustomer(customer)
    setDetailDialogOpen(true)
  }

  function openDeleteDialog(customer: Customer) {
    setSelectedCustomer(customer)
    setDeleteDialogOpen(true)
  }

  function handleCreate() {
    if (!validateForm()) return
    createMutation.mutate(formData)
  }

  function handleUpdate() {
    if (!selectedCustomer || !validateForm()) return
    updateMutation.mutate({ id: selectedCustomer.id, data: formData })
  }

  const totalCustomers = customers?.length ?? 0
  const totalRevenue = customers?.reduce((sum, c) => sum + c.totalPurchases, 0) ?? 0

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-sm text-muted-foreground">
            Manage customer records and purchase history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button onClick={openAddDialog} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Customer
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Customers
                  </p>
                  <p className="text-xl lg:text-2xl font-bold tracking-tight text-teal-600 dark:text-teal-400">
                    {totalCustomers}
                  </p>
                </div>
                <div className="flex items-center justify-center rounded-xl p-2.5 bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 opacity-40" />
          </Card>
          <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Revenue
                  </p>
                  <p className="text-xl lg:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalRevenue)}
                  </p>
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Active Today
                  </p>
                  <p className="text-xl lg:text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
                    {customers?.filter((c) => {
                      if (!c.lastVisit) return false
                      const today = new Date().toISOString().split('T')[0]
                      return c.lastVisit.startsWith(today)
                    }).length ?? 0}
                  </p>
                </div>
                <div className="flex items-center justify-center rounded-xl p-2.5 bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 opacity-40" />
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearch('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customer List
              </CardTitle>
              <CardDescription>
                {debouncedSearch
                  ? `Showing results for "${debouncedSearch}"`
                  : `${totalCustomers} customer${totalCustomers !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="px-6">
              <TableSkeleton />
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-destructive mb-2">Failed to load customers.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          ) : customers && customers.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead>
                      <TableHead className="hidden xl:table-cell">Doctor</TableHead>
                      <TableHead className="text-right">Purchases</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Visit</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetailDialog(customer)}
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 shrink-0">
                              <UserCircle className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-sm">{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {customer.phone ? (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {customer.phone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {customer.email || '—'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                          {customer.doctorName || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-sm">
                              {formatCurrency(customer.totalPurchases)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {customer.totalOrders} order{customer.totalOrders !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDate(customer.lastVisit)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openDetailDialog(customer)}
                              title="View details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditDialog(customer)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(customer)}
                              title="Delete"
                            >
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
                {customers.map((customer) => (
                  <Card
                    key={customer.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openDetailDialog(customer)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 shrink-0">
                            <UserCircle className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {customer.phone || 'No phone'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(customer)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        <div className="flex items-center gap-3">
                          {customer.totalOrders > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              {customer.totalOrders} order{customer.totalOrders !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {customer.doctorName && (
                            <Badge variant="outline" className="text-xs">
                              <Stethoscope className="h-3 w-3 mr-1" />
                              {customer.doctorName}
                            </Badge>
                          )}
                        </div>
                        <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(customer.totalPurchases)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="rounded-full bg-teal-50 p-4 dark:bg-teal-950/50 mb-3">
                <Users className="h-8 w-8 text-teal-500" />
              </div>
              <p className="font-medium text-sm">No customers found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {debouncedSearch
                  ? `No customers match "${debouncedSearch}". Try a different search term.`
                  : 'Start by adding your first customer to track their purchases and history.'}
              </p>
              {!debouncedSearch && (
                <Button size="sm" className="mt-4 gap-2" onClick={openAddDialog}>
                  <Plus className="h-4 w-4" />
                  Add Customer
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Customer Dialog ──────────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) { setAddDialogOpen(false); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </DialogTitle>
            <DialogDescription>Add a new customer to your pharmacy records.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="add-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-name"
                placeholder="Customer name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                autoFocus
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-address">Address</Label>
              <Input
                id="add-address"
                placeholder="Address"
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-doctor">Doctor Name</Label>
              <Input
                id="add-doctor"
                placeholder="Prescribing doctor (optional)"
                value={formData.doctorName}
                onChange={(e) => handleFieldChange('doctorName', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Customer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Customer Dialog ─────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setSelectedCustomer(null); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Edit Customer
            </DialogTitle>
            <DialogDescription>Update customer information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="Customer name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                autoFocus
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                placeholder="Address"
                value={formData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-doctor">Doctor Name</Label>
              <Input
                id="edit-doctor"
                placeholder="Prescribing doctor (optional)"
                value={formData.doctorName}
                onChange={(e) => handleFieldChange('doctorName', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedCustomer(null); resetForm() }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  Update Customer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Customer Detail Dialog ───────────────────────────────────────── */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => { if (!open) { setDetailDialogOpen(false); setSelectedCustomer(null) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Customer Details
            </DialogTitle>
            <DialogDescription>Customer information and purchase history.</DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <>
              {/* Customer Info Card */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                      <UserCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{selectedCustomer.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Customer since {formatDate(selectedCustomer.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => { setDetailDialogOpen(false); openEditDialog(selectedCustomer) }}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{selectedCustomer.email}</span>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{selectedCustomer.address}</span>
                    </div>
                  )}
                  {selectedCustomer.doctorName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                      <span>{selectedCustomer.doctorName}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedCustomer.totalOrders} orders</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedCustomer.totalPurchases)}
                    </span>
                  </div>
                  {selectedCustomer.lastVisit && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Last: {formatDate(selectedCustomer.lastVisit)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase History */}
              <div className="flex-1 min-h-0">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Purchase History
                </h4>
                {historyLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : purchaseHistory && purchaseHistory.length > 0 ? (
                  <ScrollArea className="max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="hidden sm:table-cell text-right">Items</TableHead>
                          <TableHead className="text-right">Payment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseHistory.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-mono text-xs font-medium">
                              {sale.invoiceNo}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDateTime(sale.saleDate)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm">
                              {formatCurrency(sale.totalAmount)}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right text-sm text-muted-foreground">
                              {sale.itemCount} item{sale.itemCount !== 1 ? 's' : ''}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-xs">
                                {sale.paymentMode}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ShoppingCart className="h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No purchase history</p>
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
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">{selectedCustomer?.name}</span>? This will
              deactivate the customer record. Their existing sales records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCustomer(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCustomer && deleteMutation.mutate(selectedCustomer.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Import needed for the Receipt icon used in detail dialog
import { Receipt } from 'lucide-react'
