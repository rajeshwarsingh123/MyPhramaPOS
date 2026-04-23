'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  CalendarIcon,
  Loader2,
  PackageOpen,
  FileText,
  UserPlus,
  IndianRupee,
  Filter,
  X,
  Camera,
  ScanLine,
  Upload,
  Sparkles,
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
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

// ── Types ───────────────────────────────────────────────────────────────────

interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  gstNumber: string | null
  isActive: boolean
}

interface Medicine {
  id: string
  name: string
  genericName: string | null
  companyName: string | null
  composition: string | null
  strength: string | null
  unitType: string
  gstPercent: number
  sellingPrice: number
}

interface PurchaseFormItem {
  id: string
  medicineId: string
  medicineName: string
  batchNumber: string
  expiryDate: Date | undefined
  mfgDate: Date | undefined
  quantity: string
  purchasePrice: string
  mrp: string
  gstPercent: string
}

interface PurchaseHistoryItem {
  id: string
  invoiceNo: string | null
  invoiceDate: string
  totalAmount: number
  totalGst: number
  notes: string | null
  supplier: { id: string; name: string }
  itemCount: number
  createdAt: string
  updatedAt: string
}

interface PurchaseDetailItem {
  id: string
  quantity: number
  purchasePrice: number
  mrp: number
  gstPercent: number
  totalAmount: number
  batch: {
    id: string
    batchNumber: string
    expiryDate: string
    medicine: {
      id: string
      name: string
    }
  }
}

interface PurchaseDetail {
  id: string
  invoiceNo: string | null
  invoiceDate: string
  totalAmount: number
  totalGst: number
  notes: string | null
  createdAt: string
  supplier: {
    id: string
    name: string
    phone: string | null
    email: string | null
    address: string | null
    gstNumber: string | null
  }
  items: PurchaseDetailItem[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function generateBatchNumber(): string {
  const now = new Date()
  const prefix = 'BN'
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${dateStr}-${random}`
}

function createEmptyItem(): PurchaseFormItem {
  return {
    id: crypto.randomUUID(),
    medicineId: '',
    medicineName: '',
    batchNumber: generateBatchNumber(),
    expiryDate: undefined,
    mfgDate: undefined,
    quantity: '',
    purchasePrice: '',
    mrp: '',
    gstPercent: '5',
  }
}

function calcItemSubtotal(item: PurchaseFormItem): number {
  const qty = parseFloat(item.quantity) || 0
  const price = parseFloat(item.purchasePrice) || 0
  const gst = parseFloat(item.gstPercent) || 0
  const base = qty * price
  const gstAmt = (base * gst) / 100
  return base + gstAmt
}

// ── New Supplier Dialog ─────────────────────────────────────────────────────

function NewSupplierDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (supplier: { name: string; phone?: string; email?: string; address?: string; gstNumber?: string }) => void
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      gstNumber: form.gstNumber.trim() || undefined,
    })
    setForm({ name: '', phone: '', email: '', address: '', gstNumber: '' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="dialog-header-gradient">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Supplier
          </DialogTitle>
          <DialogDescription>Enter the supplier details below</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-name">Name *</Label>
            <Input
              id="supplier-name"
              className="input-focus-smooth"
              placeholder="Supplier name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="supplier-phone">Phone</Label>
              <Input
                id="supplier-phone"
                className="input-focus-smooth"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-email">Email</Label>
              <Input
                id="supplier-email"
                className="input-focus-smooth"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-address">Address</Label>
            <Input
              id="supplier-address"
              className="input-focus-smooth"
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-gst">GST Number</Label>
            <Input
              id="supplier-gst"
              className="input-focus-smooth"
              placeholder="GST Number"
              value={form.gstNumber}
              onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.name.trim()} className="btn-gradient-primary">
              Add Supplier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Purchase Detail Dialog ──────────────────────────────────────────────────

function PurchaseDetailDialog({
  purchaseId,
  open,
  onOpenChange,
}: {
  purchaseId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: purchase, isLoading } = useQuery<PurchaseDetail>({
    queryKey: ['purchase-detail', purchaseId],
    queryFn: () => fetch(`/api/purchases/${purchaseId}`).then((r) => r.json()),
    enabled: !!purchaseId && open,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="dialog-header-gradient">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Purchase Order Details
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3 px-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : purchase ? (
          <div className="flex-1 overflow-auto space-y-4">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Invoice #:</span>
                <span className="ml-2 font-medium font-mono">
                  {purchase.invoiceNo || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <span className="ml-2 font-medium">
                  {format(parseISO(purchase.invoiceDate), 'dd MMM yyyy')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Supplier:</span>
                <span className="ml-2 font-medium">{purchase.supplier.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">GST #:</span>
                <span className="ml-2 font-medium">
                  {purchase.supplier.gstNumber || 'N/A'}
                </span>
              </div>
            </div>
            {purchase.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Notes:</span>
                <p className="mt-0.5 text-foreground">{purchase.notes}</p>
              </div>
            )}
            <Separator />
            {/* Items Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Medicine</TableHead>
                  <TableHead className="text-xs">Batch</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right">Price</TableHead>
                  <TableHead className="text-xs text-right">GST %</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-xs font-medium">{item.batch.medicine.name}</TableCell>
                    <TableCell className="text-xs font-mono">{item.batch.batchNumber}</TableCell>
                    <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                    <TableCell className="text-xs text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                    <TableCell className="text-xs text-right">{item.gstPercent}%</TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {formatCurrency(item.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total GST:</span>
                  <span>{formatCurrency(purchase.totalGst)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Grand Total:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(purchase.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Purchase not found.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Medicine Autocomplete ───────────────────────────────────────────────────

function MedicineAutocomplete({
  value,
  onSelect,
  items,
}: {
  value: string
  onSelect: (med: Medicine) => void
  items: Medicine[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-sm h-9 font-normal"
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">Search medicine...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search medicine..." />
          <CommandList>
            <CommandEmpty>No medicine found.</CommandEmpty>
            <CommandGroup>
              {items.map((med) => (
                <CommandItem
                  key={med.id}
                  value={`${med.name} ${med.composition || ''} ${med.genericName || ''}`}
                  onSelect={() => {
                    onSelect(med)
                    setOpen(false)
                  }}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate text-sm">{med.name}</span>
                    {(med.strength || med.composition) && (
                      <span className="truncate text-xs text-muted-foreground">
                        {med.strength || ''}{med.strength && med.composition ? ' · ' : ''}{med.composition || ''}
                      </span>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {med.gstPercent}% GST
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Date Picker Field ───────────────────────────────────────────────────────

function DatePickerField({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal h-9 text-sm"
        >
          {value ? format(value, 'dd MMM yyyy') : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

// ── Item Row ────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  medicines,
  index,
  onUpdate,
  onRemove,
}: {
  item: PurchaseFormItem
  medicines: Medicine[]
  index: number
  onUpdate: (id: string, updates: Partial<PurchaseFormItem>) => void
  onRemove: (id: string) => void
}) {
  const subtotal = calcItemSubtotal(item)

  return (
    <div className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg purchase-item-row">
      <div className="col-span-12 lg:col-span-3">
        <Label className="text-xs text-muted-foreground mb-1 block">Medicine *</Label>
        <MedicineAutocomplete
          value={item.medicineName}
          items={medicines}
          onSelect={(med) =>
            onUpdate(item.id, {
              medicineId: med.id,
              medicineName: med.name,
              gstPercent: String(med.gstPercent),
            })
          }
        />
      </div>
      <div className="col-span-6 lg:col-span-1.5">
        <Label className="text-xs text-muted-foreground mb-1 block">Batch #</Label>
        <Input
          className="input-focus-smooth h-9 text-sm"
          value={item.batchNumber}
          onChange={(e) => onUpdate(item.id, { batchNumber: e.target.value })}
          placeholder="BN-..."
        />
      </div>
      <div className="col-span-6 lg:col-span-1.5">
        <Label className="text-xs text-muted-foreground mb-1 block">Expiry *</Label>
        <DatePickerField
          value={item.expiryDate}
          onChange={(d) => onUpdate(item.id, { expiryDate: d })}
          placeholder="Expiry date"
        />
      </div>
      <div className="col-span-6 lg:col-span-1.5">
        <Label className="text-xs text-muted-foreground mb-1 block">Qty *</Label>
        <Input
          className="input-focus-smooth h-9 text-sm"
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onUpdate(item.id, { quantity: e.target.value })}
          placeholder="0"
        />
      </div>
      <div className="col-span-6 lg:col-span-1">
        <Label className="text-xs text-muted-foreground mb-1 block">P. Price</Label>
        <Input
          className="input-focus-smooth h-9 text-sm"
          type="number"
          step="0.01"
          min="0"
          value={item.purchasePrice}
          onChange={(e) => onUpdate(item.id, { purchasePrice: e.target.value })}
          placeholder="0.00"
        />
      </div>
      <div className="col-span-6 lg:col-span-1">
        <Label className="text-xs text-muted-foreground mb-1 block">MRP</Label>
        <Input
          className="input-focus-smooth h-9 text-sm"
          type="number"
          step="0.01"
          min="0"
          value={item.mrp}
          onChange={(e) => onUpdate(item.id, { mrp: e.target.value })}
          placeholder="0.00"
        />
      </div>
      <div className="col-span-3 lg:col-span-1">
        <Label className="text-xs text-muted-foreground mb-1 block">GST %</Label>
        <Input
          className="input-focus-smooth h-9 text-sm"
          type="number"
          step="0.5"
          min="0"
          max="28"
          value={item.gstPercent}
          onChange={(e) => onUpdate(item.id, { gstPercent: e.target.value })}
          placeholder="5"
        />
      </div>
      <div className="col-span-9 lg:col-span-1 flex items-end">
        <div className="w-full">
          <Label className="text-xs text-muted-foreground mb-1 block">Subtotal</Label>
          <div className="h-9 flex items-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(subtotal)}
          </div>
        </div>
      </div>
      <div className="col-span-3 lg:col-span-1 flex items-end justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(item.id)}
          disabled={false}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Scan Bill Dialog ────────────────────────────────────────────────────────

interface ScannedItem {
  medicine_name: string
  quantity: number
  batch_number?: string
  expiry_date?: string
  mrp_or_price: number
  gst_percent?: number
  company_name?: string
  [key: string]: unknown
}

function ScanBillDialog({
  open,
  onOpenChange,
  onAddItems,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddItems: (items: ScannedItem[]) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ScannedItem[] | null>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const resetState = () => {
    setFile(null)
    setPreviewUrl(null)
    setScanning(false)
    setError(null)
    setResults(null)
    setRawText(null)
    setDragOver(false)
  }

  const handleFileSelect = (f: File) => {
    resetState()
    setFile(f)
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreviewUrl(url)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  const handleScan = async () => {
    if (!file) return
    setScanning(true)
    setError(null)
    setResults(null)
    setRawText(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/ai/scan-bill', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to scan bill')
        return
      }

      if (data.success && data.items) {
        setResults(data.items)
      } else {
        setError(data.error || 'Could not extract structured data from the bill.')
        if (data.raw) setRawText(data.raw)
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setScanning(false)
    }
  }

  const handleAddToPurchase = () => {
    if (results && results.length > 0) {
      onAddItems(results)
      toast.success(`${results.length} item(s) added to purchase form!`)
      resetState()
      onOpenChange(false)
    }
  }

  const handleClose = (val: boolean) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    resetState()
    onOpenChange(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="dialog-header-gradient">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            AI Bill Scanner
          </DialogTitle>
          <DialogDescription>
            Upload a supplier bill/invoice image to automatically extract medicine details
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Upload Area */}
          {!results && (
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                }}
              />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Drop a bill image here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports JPEG, PNG, GIF, WebP, BMP, PDF (max 10MB)</p>
            </div>
          )}

          {/* File Preview */}
          {file && previewUrl && !results && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[240px]">{file.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    resetState()
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="rounded-lg overflow-hidden border bg-muted/20 max-h-[240px]">
                <img
                  src={previewUrl}
                  alt="Bill preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <Button
                className="w-full gap-2 btn-gradient-primary"
                onClick={handleScan}
                disabled={scanning}
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning Bill with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Scan Bill
                  </>
                )}
              </Button>
            </div>
          )}

          {/* PDF File Info (no preview) */}
          {file && file.type === 'application/pdf' && !results && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[240px]">{file.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    resetState()
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                className="w-full gap-2 btn-gradient-primary"
                onClick={handleScan}
                disabled={scanning}
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning Bill with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Scan Bill
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Scanning Animation */}
          {scanning && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-muted-foreground/20 border-t-violet-500 animate-spin" />
                <Sparkles className="h-6 w-6 text-violet-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Analyzing your bill...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI is extracting medicine details from the document
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
              {rawText && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    View raw extracted text
                  </summary>
                  <pre className="mt-2 text-xs bg-muted/50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                    {rawText}
                  </pre>
                </details>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={resetState}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Results Table */}
          {results && results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-semibold">
                  {results.length} Item{results.length !== 1 ? 's' : ''} Extracted
                </span>
                <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  AI Generated
                </Badge>
              </div>
              <ScrollArea className="scroll-container max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Medicine</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs">Batch</TableHead>
                      <TableHead className="text-xs">Expiry</TableHead>
                      <TableHead className="text-xs text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-xs font-medium max-w-[200px]">
                          <div className="truncate" title={item.medicine_name}>
                            {item.medicine_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {item.batch_number || '—'}
                        </TableCell>
                        <TableCell className="text-xs">{item.expiry_date || '—'}</TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {formatCurrency(item.mrp_or_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Items will be added to the purchase form. You can edit the details before saving.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {results && results.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button className="gap-2 btn-gradient-primary" onClick={handleAddToPurchase}>
              <Plus className="h-4 w-4" />
              Add to Purchase ({results.length} items)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Form Skeleton ───────────────────────────────────────────────────────────

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-9 w-32" />
    </div>
  )
}

// ── History Table Skeleton ──────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

// ── Main Purchases Page ─────────────────────────────────────────────────────

export function PurchasesPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(true)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PurchaseFormItem[]>([createEmptyItem()])

  // History state
  const [historySearch, setHistorySearch] = useState('')
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [detailPurchaseId, setDetailPurchaseId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)

  // Fetch suppliers
  const { data: suppliersData } = useQuery<{ suppliers: Supplier[] }>({
    queryKey: ['suppliers'],
    queryFn: () => fetch('/api/suppliers').then((r) => r.json()),
  })

  // Fetch medicines
  const { data: medicinesData } = useQuery<{ medicines: Medicine[] }>({
    queryKey: ['medicines-list'],
    queryFn: () => fetch('/api/medicines?limit=200').then((r) => r.json()),
  })

  // Fetch purchase history
  const {
    data: historyData,
    isLoading: historyLoading,
  } = useQuery<{
    purchases: PurchaseHistoryItem[]
    total: number
    page: number
    limit: number
  }>({
    queryKey: ['purchases-history', historySearch, fromDate, toDate, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (historySearch) params.set('search', historySearch)
      if (fromDate) params.set('fromDate', format(fromDate, 'yyyy-MM-dd'))
      if (toDate) params.set('toDate', format(toDate, 'yyyy-MM-dd'))
      params.set('page', String(page))
      params.set('limit', '10')
      return fetch(`/api/purchases?${params}`).then((r) => r.json())
    },
  })

  // Create purchase mutation
  const createPurchase = useMutation({
    mutationFn: async (data: {
      supplierId: string
      invoiceNo?: string
      invoiceDate?: string
      notes?: string
      items: Array<{
        medicineId: string
        batchNumber: string
        expiryDate: string
        mfgDate?: string
        quantity: number
        purchasePrice: number
        mrp: number
        gstPercent: number
      }>
    }) => {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create purchase')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Purchase order created successfully!')
      queryClient.invalidateQueries({ queryKey: ['purchases-history'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      // Reset form
      setSelectedSupplierId('')
      setInvoiceNo('')
      setInvoiceDate(undefined)
      setNotes('')
      setItems([createEmptyItem()])
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create purchase order')
    },
  })

  // Create supplier mutation
  const createSupplier = useMutation({
    mutationFn: async (data: {
      name: string
      phone?: string
      email?: string
      address?: string
      gstNumber?: string
    }) => {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create supplier')
      return res.json()
    },
    onSuccess: (supplier: Supplier) => {
      toast.success(`Supplier "${supplier.name}" added!`)
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setSelectedSupplierId(supplier.id)
    },
    onError: () => {
      toast.error('Failed to add supplier')
    },
  })

  // Item handlers
  const updateItem = useCallback((id: string, updates: Partial<PurchaseFormItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))
  }, [])

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()])
  }, [])

  // Calculated totals
  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + calcItemSubtotal(item), 0), [items])
  const totalGst = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.purchasePrice) || 0
      const gst = parseFloat(item.gstPercent) || 0
      return sum + ((qty * price) * gst) / 100
    }, 0)
  }, [items])

  const selectedSupplier = suppliersData?.suppliers.find((s) => s.id === selectedSupplierId)

  const handleSave = () => {
    if (!selectedSupplierId) {
      toast.error('Please select a supplier')
      return
    }
    const validItems = items.filter((item) => item.medicineId && item.quantity && item.expiryDate && item.purchasePrice)
    if (validItems.length === 0) {
      toast.error('Please add at least one valid item')
      return
    }
    for (const item of validItems) {
      if (parseFloat(item.quantity) <= 0) {
        toast.error('Quantity must be greater than 0')
        return
      }
      if (parseFloat(item.purchasePrice) <= 0) {
        toast.error('Purchase price must be greater than 0')
        return
      }
    }

    createPurchase.mutate({
      supplierId: selectedSupplierId,
      invoiceNo: invoiceNo.trim() || undefined,
      invoiceDate: invoiceDate ? format(invoiceDate, 'yyyy-MM-dd') : undefined,
      notes: notes.trim() || undefined,
      items: validItems.map((item) => ({
        medicineId: item.medicineId,
        batchNumber: item.batchNumber.trim() || generateBatchNumber(),
        expiryDate: format(item.expiryDate!, 'yyyy-MM-dd'),
        mfgDate: item.mfgDate ? format(item.mfgDate, 'yyyy-MM-dd') : undefined,
        quantity: parseInt(item.quantity),
        purchasePrice: parseFloat(item.purchasePrice),
        mrp: parseFloat(item.mrp) || parseFloat(item.purchasePrice),
        gstPercent: parseFloat(item.gstPercent) || 5,
      })),
    })
  }

  const totalPages = historyData ? Math.ceil(historyData.total / 10) : 1
  const medicines = medicinesData?.medicines || []

  // Handle scanned items from AI Bill Scanner
  const handleScannedItems = useCallback((scannedItems: ScannedItem[]) => {
    const newItems: PurchaseFormItem[] = scannedItems.map((scanned) => {
      // Try to match with existing medicine in DB
      const matchedMedicine = medicines.find(
        (m) =>
          m.name.toLowerCase() === scanned.medicine_name.toLowerCase() ||
          m.name.toLowerCase().includes(scanned.medicine_name.toLowerCase()) ||
          scanned.medicine_name.toLowerCase().includes(m.name.toLowerCase())
      )

      let expiryDate: Date | undefined = undefined
      if (scanned.expiry_date) {
        const parsed = new Date(scanned.expiry_date)
        if (!isNaN(parsed.getTime())) {
          expiryDate = parsed
        }
      }

      return {
        id: crypto.randomUUID(),
        medicineId: matchedMedicine?.id || '',
        medicineName: scanned.medicine_name,
        batchNumber: scanned.batch_number || generateBatchNumber(),
        expiryDate,
        mfgDate: undefined,
        quantity: String(scanned.quantity || ''),
        purchasePrice: String(scanned.mrp_or_price || ''),
        mrp: String(scanned.mrp_or_price || ''),
        gstPercent: String(scanned.gst_percent || 5),
      }
    })
    setItems((prev) => [...prev, ...newItems])
  }, [medicines])

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Purchase Entry</h2>
          <p className="text-sm text-muted-foreground">
            Record new purchases from suppliers and manage purchase history
          </p>
        </div>
      </div>

      {/* Top Section - New Purchase Form (Collapsible) */}
      <Collapsible open={formOpen} onOpenChange={setFormOpen}>
        <Card className="purchase-form-section">
          <CardHeader className="pb-3 collapsible-form-header rounded-t-xl">
            <CollapsibleTrigger className="w-full flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                New Purchase Order
              </CardTitle>
              {formOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-5">
              {!suppliersData || !medicinesData ? (
                <FormSkeleton />
              ) : (
                <>
                  {/* Supplier + Invoice Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Supplier *</Label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="flex-1 justify-between text-sm font-normal h-9"
                            >
                              {selectedSupplier ? (
                                <span className="truncate">{selectedSupplier.name}</span>
                              ) : (
                                <span className="text-muted-foreground">Select supplier...</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search supplier..." />
                              <CommandList>
                                <CommandEmpty>No supplier found.</CommandEmpty>
                                <CommandGroup>
                                  {(suppliersData?.suppliers || []).map((s) => (
                                    <CommandItem
                                      key={s.id}
                                      value={`${s.name} ${s.phone || ''}`}
                                      onSelect={() => setSelectedSupplierId(s.id)}
                                    >
                                      <span className="truncate">{s.name}</span>
                                      {s.phone && (
                                        <span className="ml-auto text-xs text-muted-foreground">
                                          {s.phone}
                                        </span>
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => setSupplierOpen(true)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Invoice Number</Label>
                      <Input
                        className="h-9 text-sm"
                        value={invoiceNo}
                        onChange={(e) => setInvoiceNo(e.target.value)}
                        placeholder="e.g. INV-001"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Invoice Date</Label>
                      <DatePickerField
                        value={invoiceDate}
                        onChange={setInvoiceDate}
                        placeholder="Invoice date"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Items Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Items</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-8 text-xs text-violet-700 border-violet-300 hover:bg-violet-50 dark:text-violet-300 dark:border-violet-700 dark:hover:bg-violet-950/30"
                          onClick={() => setScanOpen(true)}
                        >
                          <ScanLine className="h-3.5 w-3.5" />
                          Scan Bill
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-8 text-xs"
                          onClick={addItem}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Item
                        </Button>
                      </div>
                    </div>

                    {/* Mobile: simplified cards, Desktop: compact grid rows */}
                    <ScrollArea className="scroll-container max-h-[400px]">
                      <div className="space-y-3 pr-1">
                        {items.map((item, idx) => (
                          <div key={item.id}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge variant="outline" className="text-xs h-5">
                                {idx + 1}
                              </Badge>
                              {item.medicineName && (
                                <span className="text-xs font-medium truncate">
                                  {item.medicineName}
                                </span>
                              )}
                            </div>
                            <ItemRow
                              item={item}
                              medicines={medicines}
                              index={idx}
                              onUpdate={updateItem}
                              onRemove={removeItem}
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <Separator />

                  {/* Notes + Totals + Save */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Notes</Label>
                      <Textarea
                        className="text-sm min-h-[60px] resize-none"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional notes about this purchase..."
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-6">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Total GST: </span>
                          <span className="font-medium">{formatCurrency(totalGst)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(totalAmount)}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="gap-2 btn-gradient-emerald"
                        onClick={handleSave}
                        disabled={createPurchase.isPending}
                      >
                        {createPurchase.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                        Save Purchase
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Scan Bill Dialog */}
      <ScanBillDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onAddItems={handleScannedItems}
      />

      {/* Bottom Section - Purchase History */}
      <Card className="table-zebra-soft table-header-gradient">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Purchase History
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {historyData
                  ? `${historyData.total} purchase order${historyData.total !== 1 ? 's' : ''} found`
                  : 'Loading...'}
              </CardDescription>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="relative flex-1 min-w-[200px] max-w-[320px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="input-focus-smooth pl-9 h-9 text-sm"
                placeholder="Search invoice #, supplier..."
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value)
                  setPage(1)
                }}
              />
              {historySearch && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={() => {
                    setHistorySearch('')
                    setPage(1)
                  }}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
                  <Filter className="h-3.5 w-3.5" />
                  {fromDate
                    ? `${format(fromDate, 'dd MMM')}${toDate ? ` – ${format(toDate, 'dd MMM')}` : ''}`
                    : 'Date Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-col gap-3 p-3">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                    />
                  </div>
                  {(fromDate || toDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setFromDate(undefined)
                        setToDate(undefined)
                        setPage(1)
                      }}
                    >
                      Clear dates
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {historyLoading ? (
            <div className="px-6">
              <HistorySkeleton />
            </div>
          ) : historyData && historyData.purchases.length > 0 ? (
            <>
              <div className="table-header-sticky max-h-[480px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6 text-xs">Invoice #</TableHead>
                      <TableHead className="text-xs">Supplier</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Date</TableHead>
                      <TableHead className="text-xs text-center hidden md:table-cell">Items</TableHead>
                      <TableHead className="text-xs text-right pr-6">Total Amount</TableHead>
                      <TableHead className="text-xs text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.purchases.map((po) => (
                      <TableRow key={po.id} className="group">
                        <TableCell className="pl-6">
                          <span className="font-mono text-xs font-medium">
                            {po.invoiceNo || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{po.supplier.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                          {format(parseISO(po.invoiceDate), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          <Badge variant="secondary" className="text-xs h-5">
                            {po.itemCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm pr-6">
                          {formatCurrency(po.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setDetailPurchaseId(po.id)
                              setDetailOpen(true)
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
              <div className="rounded-full bg-muted p-4">
                <PackageOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">No purchase orders found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {historySearch || fromDate || toDate
                    ? 'Try adjusting your filters'
                    : 'Create your first purchase order above'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NewSupplierDialog
        open={supplierOpen}
        onOpenChange={setSupplierOpen}
        onSubmit={(data) => createSupplier.mutate(data)}
      />
      <PurchaseDetailDialog
        purchaseId={detailPurchaseId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailPurchaseId(null)
        }}
      />
    </div>
  )
}
