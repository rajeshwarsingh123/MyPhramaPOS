'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, differenceInDays, parseISO } from 'date-fns'
import {
  Pill,
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  CalendarDays,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
} from '@/components/ui/card'
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ── Types ───────────────────────────────────────────────────────────────────

interface BatchInfo {
  id: string
  batchNumber: string
  expiryDate: string
  mfgDate: string | null
  purchasePrice: number
  mrp: number
  quantity: number
  initialQuantity: number
}

interface MedicineInfo {
  id: string
  name: string
  genericName: string | null
  companyName: string | null
  composition: string | null
  strength: string | null
  category: string | null
  unitType: string
  packSize: string | null
  gstPercent: number
  sellingPrice: number
  marginPercent: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  batches: BatchInfo[]
  totalStock: number
  earliestExpiry: string | null
  batchCount: number
}

interface MedicinesResponse {
  medicines: MedicineInfo[]
  total: number
  page: number
  limit: number
}

// ── Constants ───────────────────────────────────────────────────────────────

const UNIT_TYPES = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'injection', label: 'Injection' },
  { value: 'cream', label: 'Cream' },
  { value: 'drops', label: 'Drops' },
  { value: 'inhaler', label: 'Inhaler' },
  { value: 'powder', label: 'Powder' },
]

const GST_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '12', label: '12%' },
  { value: '18', label: '18%' },
  { value: '28', label: '28%' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function stockBadge(totalStock: number) {
  if (totalStock === 0) {
    return (
      <Badge variant="outline" className="border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/30">
        Out of Stock
      </Badge>
    )
  }
  if (totalStock < 10) {
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
        Low Stock
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
      In Stock
    </Badge>
  )
}

function expiryBadge(expiryDate: string) {
  const today = new Date()
  const expiry = parseISO(expiryDate)
  const daysLeft = differenceInDays(expiry, today)

  if (daysLeft < 0) {
    return (
      <Badge variant="outline" className="border-red-400 text-red-700 dark:border-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/40">
        Expired
      </Badge>
    )
  }
  if (daysLeft < 30) {
    return (
      <Badge variant="outline" className="border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/30">
        {daysLeft}d left
      </Badge>
    )
  }
  if (daysLeft < 90) {
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
        {daysLeft}d left
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
      OK
    </Badge>
  )
}

function getExpiryColorClass(expiryDate: string): string {
  const today = new Date()
  const expiry = parseISO(expiryDate)
  const daysLeft = differenceInDays(expiry, today)

  if (daysLeft < 0) return 'text-red-600 dark:text-red-400'
  if (daysLeft < 30) return 'text-red-500 dark:text-red-400'
  if (daysLeft < 90) return 'text-amber-500 dark:text-amber-400'
  return 'text-emerald-500 dark:text-emerald-400'
}

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const medicineFormSchema = z.object({
  name: z.string().min(1, 'Medicine name is required'),
  genericName: z.string().optional().default(''),
  companyName: z.string().optional().default(''),
  composition: z.string().optional().default(''),
  strength: z.string().optional().default(''),
  unitType: z.string().default('tablet'),
  packSize: z.string().optional().default(''),
  gstPercent: z.coerce.number().default(5),
  sellingPrice: z.coerce.number().default(0),
  marginPercent: z.coerce.number().default(0),
})

const batchFormSchema = z.object({
  batchNumber: z.string().optional().default(''),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  mfgDate: z.string().optional().default(''),
  purchasePrice: z.coerce.number().min(0, 'Must be positive'),
  mrp: z.coerce.number().min(0, 'Must be positive'),
  quantity: z.coerce.number().int().min(0, 'Must be 0 or more'),
})

// ── Skeleton Components ─────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function MedicinesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [page, setPage] = useState(1)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [expandedMedicineId, setExpandedMedicineId] = useState<string | null>(null)
  const [showMedicineDialog, setShowMedicineDialog] = useState(false)
  const [showBatchDialog, setShowBatchDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<MedicineInfo | null>(null)
  const [batchDialogMedicineId, setBatchDialogMedicineId] = useState<string | null>(null)
  const [batchDialogMedicineName, setBatchDialogMedicineName] = useState('')
  const [deletingMedicineId, setDeletingMedicineId] = useState<string | null>(null)
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null)
  const [showInitialBatch, setShowInitialBatch] = useState(false)
  const [batchFormMode, setBatchFormMode] = useState<'add' | 'edit'>('add')
  const [editingBatch, setEditingBatch] = useState<BatchInfo | null>(null)

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    const timer = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Fetch categories
  const { data: categoriesData } = useQuery<{ categories: { name: string; count: number }[] }>({
    queryKey: ['medicine-categories'],
    queryFn: () => fetch('/api/medicines/categories').then((r) => r.json()),
    staleTime: 60_000,
  })

  const categories = categoriesData?.categories || []

  // Fetch medicines
  const {
    data: medicinesData,
    isLoading,
    error,
    refetch,
  } = useQuery<MedicinesResponse>({
    queryKey: ['medicines', debouncedSearch, selectedCategory, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (selectedCategory) params.set('category', selectedCategory)
      params.set('page', String(page))
      params.set('limit', '20')
      return fetch(`/api/medicines?${params.toString()}`).then((r) => r.json())
    },
  })

  // Scroll category tab into view when selected
  useEffect(() => {
    if (!selectedCategory || !categoryScrollRef.current) return
    const activeTab = categoryScrollRef.current.querySelector(`[data-category="${selectedCategory}"]`)
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedCategory])

  function handleCategoryClick(categoryName: string) {
    setSelectedCategory((prev) => (prev === categoryName ? '' : categoryName))
    setPage(1)
  }

  // Medicine form
  const medicineForm = useForm({
    resolver: zodResolver(medicineFormSchema),
    defaultValues: {
      name: '',
      genericName: '',
      companyName: '',
      composition: '',
      strength: '',
      unitType: 'tablet',
      packSize: '',
      gstPercent: 5,
      sellingPrice: 0,
      marginPercent: 0,
    },
  })

  // Initial batch form (for add medicine dialog)
  const initialBatchForm = useForm({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      batchNumber: '',
      expiryDate: '',
      mfgDate: '',
      purchasePrice: 0,
      mrp: 0,
      quantity: 0,
    },
  })

  // Standalone batch form (for adding batch to existing medicine)
  const batchForm = useForm({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      batchNumber: '',
      expiryDate: '',
      mfgDate: '',
      purchasePrice: 0,
      mrp: 0,
      quantity: 0,
    },
  })

  // Watch purchase price and margin for auto-calculation
  const purchasePriceWatch = initialBatchForm.watch('purchasePrice')
  const marginPercentWatch = medicineForm.watch('marginPercent')

  // Auto-calculate selling price in initial batch
  const autoSellingPrice =
    marginPercentWatch > 0 && purchasePriceWatch > 0
      ? parseFloat((purchasePriceWatch * (1 + marginPercentWatch / 100)).toFixed(2))
      : null

  // Watch for standalone batch form
  const batchPurchasePriceWatch = batchForm.watch('purchasePrice')
  const [batchMedicineMargin, setBatchMedicineMargin] = useState(0)
  const batchAutoSellingPrice =
    batchMedicineMargin > 0 && batchPurchasePriceWatch > 0
      ? parseFloat((batchPurchasePriceWatch * (1 + batchMedicineMargin / 100)).toFixed(2))
      : null

  // ── Mutations ────────────────────────────────────────────────────────────

  const createMedicineMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = { ...values }
      // If initial batch data is present and form is open
      if (showInitialBatch) {
        const batchValues = initialBatchForm.getValues()
        if (batchValues.expiryDate) {
          payload.batch = {
            batchNumber: batchValues.batchNumber || `BATCH-${Date.now()}`,
            expiryDate: batchValues.expiryDate,
            mfgDate: batchValues.mfgDate || undefined,
            purchasePrice: batchValues.purchasePrice,
            mrp: batchValues.mrp,
            quantity: batchValues.quantity,
          }
        }
      }
      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create medicine')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      toast.success('Medicine created successfully')
      closeMedicineDialog()
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create medicine')
    },
  })

  const updateMedicineMutation = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/medicines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update medicine')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      toast.success('Medicine updated successfully')
      closeMedicineDialog()
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update medicine')
    },
  })

  const deleteMedicineMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/medicines/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete medicine')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      toast.success('Medicine deleted successfully')
      setShowDeleteDialog(false)
      setDeletingMedicineId(null)
      if (expandedMedicineId === deletingMedicineId) {
        setExpandedMedicineId(null)
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete medicine')
    },
  })

  const addBatchMutation = useMutation({
    mutationFn: async ({ medicineId, ...values }: { medicineId: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/medicines/${medicineId}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add batch')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      toast.success('Batch added successfully')
      closeBatchDialog()
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to add batch')
    },
  })

  const updateBatchMutation = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/batches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update batch')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      toast.success('Batch updated successfully')
      closeBatchDialog()
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update batch')
    },
  })

  const deleteBatchMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/batches/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete batch')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      toast.success('Batch deleted successfully')
      setShowBatchDeleteDialog(false)
      setDeletingBatchId(null)
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete batch')
    },
  })

  // ── Dialog Helpers ───────────────────────────────────────────────────────

  function openAddMedicineDialog() {
    setEditingMedicine(null)
    medicineForm.reset({
      name: '',
      genericName: '',
      companyName: '',
      composition: '',
      strength: '',
      unitType: 'tablet',
      packSize: '',
      gstPercent: 5,
      sellingPrice: 0,
      marginPercent: 0,
    })
    initialBatchForm.reset({
      batchNumber: '',
      expiryDate: '',
      mfgDate: '',
      purchasePrice: 0,
      mrp: 0,
      quantity: 0,
    })
    setShowInitialBatch(false)
    setShowMedicineDialog(true)
  }

  function openEditMedicineDialog(medicine: MedicineInfo) {
    setEditingMedicine(medicine)
    medicineForm.reset({
      name: medicine.name,
      genericName: medicine.genericName || '',
      companyName: medicine.companyName || '',
      composition: medicine.composition || '',
      strength: medicine.strength || '',
      unitType: medicine.unitType,
      packSize: medicine.packSize || '',
      gstPercent: medicine.gstPercent,
      sellingPrice: medicine.sellingPrice,
      marginPercent: medicine.marginPercent,
    })
    setShowMedicineDialog(true)
  }

  function closeMedicineDialog() {
    setShowMedicineDialog(false)
    setEditingMedicine(null)
    setShowInitialBatch(false)
    medicineForm.reset()
    initialBatchForm.reset()
  }

  function openAddBatchDialog(medicineId: string, medicineName: string, marginPercent: number) {
    setBatchDialogMedicineId(medicineId)
    setBatchDialogMedicineName(medicineName)
    setBatchMedicineMargin(marginPercent)
    setBatchFormMode('add')
    setEditingBatch(null)
    batchForm.reset({
      batchNumber: '',
      expiryDate: '',
      mfgDate: '',
      purchasePrice: 0,
      mrp: 0,
      quantity: 0,
    })
    setShowBatchDialog(true)
  }

  function openEditBatchDialog(batch: BatchInfo, marginPercent: number) {
    setBatchMedicineMargin(marginPercent)
    setBatchFormMode('edit')
    setEditingBatch(batch)
    batchForm.reset({
      batchNumber: batch.batchNumber,
      expiryDate: format(parseISO(batch.expiryDate), 'yyyy-MM-dd'),
      mfgDate: batch.mfgDate ? format(parseISO(batch.mfgDate), 'yyyy-MM-dd') : '',
      purchasePrice: batch.purchasePrice,
      mrp: batch.mrp,
      quantity: batch.quantity,
    })
    setShowBatchDialog(true)
  }

  function closeBatchDialog() {
    setShowBatchDialog(false)
    setBatchDialogMedicineId(null)
    setBatchDialogMedicineName('')
    setEditingBatch(null)
    batchForm.reset()
  }

  // ── Form Submissions ─────────────────────────────────────────────────────

  function onMedicineSubmit(values: Record<string, unknown>) {
    if (editingMedicine) {
      updateMedicineMutation.mutate({ id: editingMedicine.id, ...values })
    } else {
      createMedicineMutation.mutate(values)
    }
  }

  function onBatchSubmit(values: Record<string, unknown>) {
    if (batchFormMode === 'edit' && editingBatch) {
      updateBatchMutation.mutate({ id: editingBatch.id, ...values })
    } else if (batchDialogMedicineId) {
      addBatchMutation.mutate({ medicineId: batchDialogMedicineId, ...values })
    }
  }

  function toggleExpand(id: string) {
    setExpandedMedicineId((prev) => (prev === id ? null : id))
  }

  const totalPages = medicinesData ? Math.ceil(medicinesData.total / 20) : 1
  const medicines = medicinesData?.medicines || []

  // ── Date Picker Component ────────────────────────────────────────────────

  function DatePickerField({
    value,
    onChange,
    placeholder,
  }: {
    value: string
    onChange: (val: string) => void
    placeholder: string
  }) {
    const [open, setOpen] = useState(false)
    const selectedDate = value ? parseISO(value) : undefined

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left font-normal h-9"
          >
            {selectedDate ? (
              format(selectedDate, 'dd MMM yyyy')
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, 'yyyy-MM-dd'))
                setOpen(false)
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page-enter p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Medicines</h2>
          <p className="text-sm text-muted-foreground">
            Manage your medicine inventory
            {medicinesData && (
              <span className="ml-2 font-medium text-foreground">
                ({medicinesData.total} items)
              </span>
            )}
          </p>
        </div>
        <Button onClick={openAddMedicineDialog} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Add Medicine
        </Button>
      </div>

      {/* Category Filter Tabs */}
      <div
        ref={categoryScrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        <button
          onClick={() => { setSelectedCategory(''); setPage(1) }}
          className={`rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer border
            ${!selectedCategory
              ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-teal-500 shadow-sm'
              : 'border-muted bg-background text-muted-foreground hover:text-foreground hover:border-foreground/20'
            }`
        }
        >
          All Medicines
          {medicinesData && (
            <span className={`ml-1.5 text-xs ${!selectedCategory ? 'text-white/80' : 'text-muted-foreground'}`}>
              {medicinesData.total}
            </span>
          )}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.name}
            data-category={cat.name}
            onClick={() => handleCategoryClick(cat.name)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer border
              ${selectedCategory === cat.name
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-teal-500 shadow-sm'
                : 'border-muted bg-background text-muted-foreground hover:text-foreground hover:border-foreground/20'
              }`
            }
          >
            {cat.name}
            <span className={`ml-1.5 text-xs ${selectedCategory === cat.name ? 'text-white/80' : 'text-muted-foreground'}`}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, composition, company..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode('table')}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => refetch()}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === 'table' ? <TableSkeleton /> : <CardGridSkeleton />
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-destructive">Failed to load medicines.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : medicines.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="rounded-full bg-muted p-4">
              <Pill className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No medicines found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {debouncedSearch || selectedCategory
                  ? 'Try adjusting your search or category filter'
                  : 'Start by adding your first medicine'}
              </p>
            </div>
            {!debouncedSearch && !selectedCategory && (
              <Button onClick={openAddMedicineDialog} className="gap-2 mt-2">
                <Plus className="h-4 w-4" />
                Add Medicine
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <div className="table-header-sticky overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Medicine</TableHead>
                      <TableHead className="hidden lg:table-cell">Category</TableHead>
                      <TableHead className="hidden md:table-cell">Company</TableHead>
                      <TableHead className="hidden sm:table-cell">Unit</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Price</TableHead>
                      <TableHead className="hidden sm:table-cell">GST</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicines.map((med) => (
                      <>
                        <TableRow
                          key={med.id}
                          className="table-row-interactive table-row-hover cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(med.id)}
                        >
                          <TableCell className="w-8 px-2">
                            {expandedMedicineId === med.id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{med.name}</p>
                              {med.strength && (
                                <p className="text-xs text-muted-foreground">{med.strength}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {med.category || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <p className="text-sm text-muted-foreground truncate max-w-[120px]">
                              {med.companyName || '—'}
                            </p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-sm capitalize">{med.unitType}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-sm">{med.totalStock}</span>
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            <span className="text-sm">{formatCurrency(med.sellingPrice)}</span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-sm">{med.gstPercent}%</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {stockBadge(med.totalStock)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div
                              className="flex items-center justify-end gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditMedicineDialog(med)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeletingMedicineId(med.id)
                                  setShowDeleteDialog(true)
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded batches */}
                        {expandedMedicineId === med.id && (
                          <TableRow key={`${med.id}-batches`}>
                            <TableCell colSpan={10} className="bg-muted/30 px-4 py-3">
                              <BatchTable
                                medicine={med}
                                onAddBatch={() =>
                                  openAddBatchDialog(med.id, med.name, med.marginPercent)
                                }
                                onEditBatch={(batch) =>
                                  openEditBatchDialog(batch, med.marginPercent)
                                }
                                onDeleteBatch={(batchId) => {
                                  setDeletingBatchId(batchId)
                                  setShowBatchDeleteDialog(true)
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({medicinesData.total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {medicines.map((med) => (
              <Collapsible
                key={med.id}
                open={expandedMedicineId === med.id}
                onOpenChange={(open) => {
                  if (open) setExpandedMedicineId(med.id)
                  else setExpandedMedicineId(null)
                }}
              >
                <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{med.name}</p>
                            {expandedMedicineId === med.id ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          {med.strength && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {med.strength} · {med.unitType}
                            </p>
                          )}
                          {med.category && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {med.category}
                            </p>
                          )}
                        </div>
                        {stockBadge(med.totalStock)}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Stock</p>
                            <p className="text-sm font-semibold">{med.totalStock}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Price</p>
                            <p className="text-sm font-semibold">
                              {formatCurrency(med.sellingPrice)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">GST</p>
                            <p className="text-sm">{med.gstPercent}%</p>
                          </div>
                        </div>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditMedicineDialog(med)
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingMedicineId(med.id)
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t px-4 py-3">
                      <BatchTable
                        medicine={med}
                        compact
                        onAddBatch={() =>
                          openAddBatchDialog(med.id, med.name, med.marginPercent)
                        }
                        onEditBatch={(batch) =>
                          openEditBatchDialog(batch, med.marginPercent)
                        }
                        onDeleteBatch={(batchId) => {
                          setDeletingBatchId(batchId)
                          setShowBatchDeleteDialog(true)
                        }}
                      />
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({medicinesData.total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add/Edit Medicine Dialog ────────────────────────────────────────── */}
      <Dialog open={showMedicineDialog} onOpenChange={(open) => !open && closeMedicineDialog()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="dialog-header-gradient">
            <DialogTitle>
              {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
            </DialogTitle>
            <DialogDescription>
              {editingMedicine
                ? 'Update medicine details and pricing.'
                : 'Fill in the medicine details. You can optionally add an initial batch.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...medicineForm}>
            <form onSubmit={medicineForm.handleSubmit(onMedicineSubmit)} className="space-y-4">
              {/* Basic Info Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Basic Information</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={medicineForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>
                          Medicine Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Paracetamol 500mg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={medicineForm.control}
                    name="genericName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Generic Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Acetaminophen" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={medicineForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company / Brand</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Cipla" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={medicineForm.control}
                    name="composition"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Salt / Composition</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Paracetamol 500mg + Caffeine 65mg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={medicineForm.control}
                    name="strength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strength</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 500mg, 10ml" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={medicineForm.control}
                    name="unitType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UNIT_TYPES.map((u) => (
                              <SelectItem key={u.value} value={u.value}>
                                {u.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={medicineForm.control}
                    name="packSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pack Size</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 10, 30, 100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={medicineForm.control}
                    name="gstPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST %</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(parseFloat(v))}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="GST %" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GST_OPTIONS.map((g) => (
                              <SelectItem key={g.value} value={g.value}>
                                {g.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={medicineForm.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={medicineForm.control}
                    name="marginPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Margin %</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Initial Batch Section (only for new medicines) */}
              {!editingMedicine && (
                <>
                  <Separator />
                  <Collapsible
                    open={showInitialBatch}
                    onOpenChange={setShowInitialBatch}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto"
                      >
                        <span className="text-sm font-semibold">
                          Add Initial Batch
                        </span>
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                        <p className="text-xs text-muted-foreground">
                          Optional: Add the first batch for this medicine
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Batch Number</Label>
                            <Input
                              placeholder="Auto-generated if empty"
                              className="mt-1 h-8 text-sm"
                              {...initialBatchForm.register('batchNumber')}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">
                              Expiry Date <span className="text-destructive">*</span>
                            </Label>
                            <div className="mt-1">
                              <DatePickerField
                                value={initialBatchForm.watch('expiryDate') || ''}
                                onChange={(val) =>
                                  initialBatchForm.setValue('expiryDate', val, {
                                    shouldValidate: true,
                                  })
                                }
                                placeholder="Select date"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">Manufacturing Date</Label>
                            <div className="mt-1">
                              <DatePickerField
                                value={initialBatchForm.watch('mfgDate') || ''}
                                onChange={(val) =>
                                  initialBatchForm.setValue('mfgDate', val)
                                }
                                placeholder="Select date"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">Purchase Price (₹)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="mt-1 h-8 text-sm"
                              {...initialBatchForm.register('purchasePrice', {
                                valueAsNumber: true,
                              })}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">MRP (₹)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="mt-1 h-8 text-sm"
                              {...initialBatchForm.register('mrp', {
                                valueAsNumber: true,
                              })}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="0"
                              className="mt-1 h-8 text-sm"
                              {...initialBatchForm.register('quantity', {
                                valueAsNumber: true,
                              })}
                            />
                          </div>
                        </div>

                        {/* Auto-calculated selling price */}
                        {autoSellingPrice && (
                          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-2 text-xs">
                            <span className="text-emerald-700 dark:text-emerald-400">
                              💰 Auto-calculated selling price:{' '}
                              <strong>{formatCurrency(autoSellingPrice)}</strong>
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-500 ml-1">
                              (Purchase {formatCurrency(purchasePriceWatch)} + {marginPercentWatch}% margin)
                            </span>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeMedicineDialog}
                  disabled={
                    createMedicineMutation.isPending || updateMedicineMutation.isPending
                  }
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMedicineMutation.isPending || updateMedicineMutation.isPending
                  }
                >
                  {createMedicineMutation.isPending || updateMedicineMutation.isPending
                    ? 'Saving...'
                    : editingMedicine
                    ? 'Update Medicine'
                    : 'Create Medicine'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Batch Dialog ───────────────────────────────────────────── */}
      <Dialog open={showBatchDialog} onOpenChange={(open) => !open && closeBatchDialog()}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="dialog-header-gradient">
            <DialogTitle>
              {batchFormMode === 'edit' ? 'Edit Batch' : 'Add Batch'}
            </DialogTitle>
            <DialogDescription>
              {batchFormMode === 'edit'
                ? 'Update batch details.'
                : `Add a new batch for ${batchDialogMedicineName}`}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={batchForm.handleSubmit(onBatchSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Batch Number</Label>
                <Input
                  placeholder="Auto-generated if empty"
                  className="mt-1 h-9 text-sm"
                  {...batchForm.register('batchNumber')}
                />
              </div>

              <div>
                <Label className="text-xs">
                  Expiry Date <span className="text-destructive">*</span>
                </Label>
                <div className="mt-1">
                  <DatePickerField
                    value={batchForm.watch('expiryDate') || ''}
                    onChange={(val) =>
                      batchForm.setValue('expiryDate', val, { shouldValidate: true })
                    }
                    placeholder="Select date"
                  />
                </div>
                {batchForm.formState.errors.expiryDate && (
                  <p className="text-xs text-destructive mt-1">
                    {batchForm.formState.errors.expiryDate.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs">Manufacturing Date</Label>
                <div className="mt-1">
                  <DatePickerField
                    value={batchForm.watch('mfgDate') || ''}
                    onChange={(val) => batchForm.setValue('mfgDate', val)}
                    placeholder="Select date"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Purchase Price (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1 h-9 text-sm"
                  {...batchForm.register('purchasePrice', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label className="text-xs">MRP (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1 h-9 text-sm"
                  {...batchForm.register('mrp', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1 h-9 text-sm"
                  {...batchForm.register('quantity', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Auto-calculated selling price */}
            {batchAutoSellingPrice && (
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-2 text-xs">
                <span className="text-emerald-700 dark:text-emerald-400">
                  💰 Auto-calculated selling price:{' '}
                  <strong>{formatCurrency(batchAutoSellingPrice)}</strong>
                </span>
                <span className="text-emerald-600 dark:text-emerald-500 ml-1">
                  (Purchase {formatCurrency(batchPurchasePriceWatch)} + {batchMedicineMargin}% margin)
                </span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeBatchDialog}
                disabled={
                  addBatchMutation.isPending || updateBatchMutation.isPending
                }
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  addBatchMutation.isPending || updateBatchMutation.isPending
                }
              >
                {addBatchMutation.isPending || updateBatchMutation.isPending
                  ? 'Saving...'
                  : batchFormMode === 'edit'
                  ? 'Update Batch'
                  : 'Add Batch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Medicine Dialog ──────────────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medicine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this medicine? This will also soft-delete all
              associated batches. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMedicineMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMedicineId && deleteMedicineMutation.mutate(deletingMedicineId)}
              disabled={deleteMedicineMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMedicineMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Batch Dialog ─────────────────────────────────────────────── */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this batch? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBatchMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingBatchId && deleteBatchMutation.mutate(deletingBatchId)}
              disabled={deleteBatchMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBatchMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Batch Table Sub-Component ───────────────────────────────────────────────

function BatchTable({
  medicine,
  compact,
  onAddBatch,
  onEditBatch,
  onDeleteBatch,
}: {
  medicine: MedicineInfo
  compact?: boolean
  onAddBatch: () => void
  onEditBatch: (batch: BatchInfo) => void
  onDeleteBatch: (batchId: string) => void
}) {
  if (medicine.batches.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">No batches added yet</p>
        <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={onAddBatch}>
          <Plus className="h-3.5 w-3.5" />
          Add Batch
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">
          Batches ({medicine.batches.length})
        </p>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onAddBatch}>
          <Plus className="h-3 w-3" />
          Add Batch
        </Button>
      </div>
      <ScrollArea className={compact ? 'max-h-48' : 'max-h-64'}>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className={compact ? 'h-8' : ''}>
                <TableHead className={compact ? 'text-xs py-1.5' : 'text-xs'}>Batch #</TableHead>
                <TableHead className={`text-right ${compact ? 'text-xs py-1.5' : 'text-xs'}`}>
                  Qty
                </TableHead>
                {!compact && (
                  <>
                    <TableHead className="text-right text-xs">Purchase</TableHead>
                    <TableHead className="text-right text-xs">MRP</TableHead>
                  </>
                )}
                <TableHead className={`${!compact ? 'hidden sm:table-cell ' : ''} ${compact ? 'text-xs py-1.5' : 'text-xs'}`}>
                  Expiry
                </TableHead>
                <TableHead className={`text-right ${compact ? 'text-xs py-1.5' : 'text-xs'}`}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicine.batches.map((batch) => (
                <TableRow key={batch.id} className={compact ? 'h-8' : ''}>
                  <TableCell className={`font-mono ${compact ? 'text-xs py-1.5' : 'text-xs'}`}>
                    {batch.batchNumber}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${compact ? 'text-xs py-1.5' : 'text-xs'} ${
                      batch.quantity === 0
                        ? 'text-red-500'
                        : batch.quantity < 10
                        ? 'text-amber-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {batch.quantity}
                  </TableCell>
                  {!compact && (
                    <>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(batch.purchasePrice)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(batch.mrp)}
                      </TableCell>
                    </>
                  )}
                  <TableCell
                    className={`${!compact ? 'hidden sm:table-cell ' : ''} ${compact ? 'text-xs py-1.5' : 'text-xs'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={getExpiryColorClass(batch.expiryDate)}>
                        {format(parseISO(batch.expiryDate), 'MMM yyyy')}
                      </span>
                      {expiryBadge(batch.expiryDate)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`text-muted-foreground hover:text-foreground ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}
                        onClick={() => onEditBatch(batch)}
                      >
                        <Edit className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDeleteBatch(batch.id)}
                      >
                        <Trash2 className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  )
}
