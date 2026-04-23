'use client'

import { useState, useSyncExternalStore } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  Store,
  Save,
  RefreshCw,
  Sun,
  Moon,
  Download,
  Database,
  FileText,
  Receipt,
  Palette,
  HardDrive,
  Info,
  CheckCircle2,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

// ── Types ───────────────────────────────────────────────────────────────────

interface StoreSettings {
  id: string
  storeName: string
  phone: string | null
  email: string | null
  address: string | null
  gstNumber: string | null
  licenseNo: string | null
  logoUrl: string | null
  invoicePrefix: string
  nextInvoiceNo: number
  updatedAt: string
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-52" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()

  // useSyncExternalStore for hydration-safe mounted check (avoids useEffect setState)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // Display name
  const [displayName, setDisplayName] = useState('PharmPOS')

  // Fetch settings
  const {
    data: settings,
    isLoading,
    refetch,
  } = useQuery<StoreSettings>({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/settings').then((r) => r.json()),
  })

  // Store info editing state
  const [editingStore, setEditingStore] = useState(false)
  const [editStoreName, setEditStoreName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editGstNumber, setEditGstNumber] = useState('')
  const [editLicenseNo, setEditLicenseNo] = useState('')

  // Invoice editing state
  const [editingInvoice, setEditingInvoice] = useState(false)
  const [editInvoicePrefix, setEditInvoicePrefix] = useState('')
  const [editNextInvoiceNo, setEditNextInvoiceNo] = useState('')

  // Derived values: show edited values when editing, server values otherwise
  const storeName = editingStore ? editStoreName : (settings?.storeName ?? '')
  const phone = editingStore ? editPhone : (settings?.phone ?? '')
  const email = editingStore ? editEmail : (settings?.email ?? '')
  const address = editingStore ? editAddress : (settings?.address ?? '')
  const gstNumber = editingStore ? editGstNumber : (settings?.gstNumber ?? '')
  const licenseNo = editingStore ? editLicenseNo : (settings?.licenseNo ?? '')
  const invoicePrefix = editingInvoice ? editInvoicePrefix : (settings?.invoicePrefix ?? 'INV')
  const nextInvoiceNo = editingInvoice ? editNextInvoiceNo : String(settings?.nextInvoiceNo ?? 1)

  function beginEditStore() {
    setEditStoreName(settings?.storeName ?? '')
    setEditPhone(settings?.phone ?? '')
    setEditEmail(settings?.email ?? '')
    setEditAddress(settings?.address ?? '')
    setEditGstNumber(settings?.gstNumber ?? '')
    setEditLicenseNo(settings?.licenseNo ?? '')
    setEditingStore(true)
  }

  function cancelEditStore() {
    setEditingStore(false)
  }

  function beginEditInvoice() {
    setEditInvoicePrefix(settings?.invoicePrefix ?? 'INV')
    setEditNextInvoiceNo(String(settings?.nextInvoiceNo ?? 1))
    setEditingInvoice(true)
  }

  function cancelEditInvoice() {
    setEditingInvoice(false)
  }

  // Update store settings mutation
  const updateStoreMutation = useMutation({
    mutationFn: (data: {
      storeName: string
      phone: string
      email: string
      address: string
      gstNumber: string
      licenseNo: string
    }) =>
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setEditingStore(false)
      toast.success('Store settings saved successfully')
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error || 'Failed to save store settings')
    },
  })

  // Update invoice settings mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: (data: { invoicePrefix: string; nextInvoiceNo: number }) =>
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e))
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setEditingInvoice(false)
      toast.success('Invoice settings updated successfully')
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error || 'Failed to update invoice settings')
    },
  })

  function handleSaveStore() {
    if (!storeName.trim()) {
      toast.error('Store name is required')
      return
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Invalid email format')
      return
    }
    updateStoreMutation.mutate({
      storeName: storeName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      gstNumber: gstNumber.trim(),
      licenseNo: licenseNo.trim(),
    })
  }

  function handleUpdateInvoice() {
    const prefix = invoicePrefix.trim()
    const nextNo = parseInt(nextInvoiceNo, 10)
    if (!prefix) {
      toast.error('Invoice prefix is required')
      return
    }
    if (isNaN(nextNo) || nextNo < 1) {
      toast.error('Next invoice number must be a positive integer')
      return
    }
    updateInvoiceMutation.mutate({ invoicePrefix: prefix, nextInvoiceNo: nextNo })
  }

  function handleExportData() {
    toast.info('Export Data feature coming soon!')
  }

  function handleBackupDatabase() {
    toast.info('Backup Database feature coming soon!')
  }

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-sm text-muted-foreground">Configure your pharmacy settings</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
        <SettingsSkeleton />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure your pharmacy settings and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            System Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Store Information Section ─────────────────────────────────── */}
        <Card className="card-spotlight lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center rounded-lg bg-teal-50 p-2 dark:bg-teal-950/50">
                  <Store className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Store Information</CardTitle>
                  <CardDescription>
                    Your pharmacy business details shown on invoices
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="storeName" className="label-semibold">
                  Store Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="storeName"
                  className="input-focus-smooth"
                  placeholder="My Pharmacy"
                  value={storeName}
                  onChange={(e) => {
                    if (!editingStore) beginEditStore()
                    setEditStoreName(e.target.value)
                  }}
                  onFocus={() => { if (!editingStore) beginEditStore() }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="label-semibold">Phone</Label>
                <Input
                  id="phone"
                  className="input-focus-smooth"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => {
                    if (!editingStore) beginEditStore()
                    setEditPhone(e.target.value)
                  }}
                  onFocus={() => { if (!editingStore) beginEditStore() }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="label-semibold">Email</Label>
                <Input
                  id="email"
                  className="input-focus-smooth"
                  type="email"
                  placeholder="pharmacy@email.com"
                  value={email}
                  onChange={(e) => {
                    if (!editingStore) beginEditStore()
                    setEditEmail(e.target.value)
                  }}
                  onFocus={() => { if (!editingStore) beginEditStore() }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gstNumber" className="label-semibold">GST Number</Label>
                <Input
                  id="gstNumber"
                  className="input-focus-smooth"
                  placeholder="22AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => {
                    if (!editingStore) beginEditStore()
                    setEditGstNumber(e.target.value)
                  }}
                  onFocus={() => { if (!editingStore) beginEditStore() }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address" className="label-semibold">Address</Label>
              <Input
                id="address"
                className="input-focus-smooth"
                placeholder="Full address"
                value={address}
                onChange={(e) => {
                  if (!editingStore) beginEditStore()
                  setEditAddress(e.target.value)
                }}
                onFocus={() => { if (!editingStore) beginEditStore() }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="licenseNo" className="label-semibold">Drug License Number</Label>
              <Input
                id="licenseNo"
                className="input-focus-smooth"
                placeholder="DL-XXXX-XXXX"
                value={licenseNo}
                onChange={(e) => {
                  if (!editingStore) beginEditStore()
                  setEditLicenseNo(e.target.value)
                }}
                onFocus={() => { if (!editingStore) beginEditStore() }}
              />
            </div>
            <div className="flex justify-end pt-2 gap-2">
              {editingStore && (
                <Button variant="outline" onClick={cancelEditStore} className="gap-2">
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSaveStore}
                disabled={updateStoreMutation.isPending || !editingStore}
                className="focus-ring-emerald gap-2 shadow-sm"
              >
                {updateStoreMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Store Info
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Invoice Settings Section ──────────────────────────────────── */}
        <Card className="card-spotlight">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/50">
                <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Invoice Settings</CardTitle>
                <CardDescription>Configure invoice numbering</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invoicePrefix" className="label-semibold">Invoice Prefix</Label>
              <Input
                id="invoicePrefix"
                className="input-focus-smooth"
                placeholder="INV"
                value={invoicePrefix}
                onChange={(e) => {
                  if (!editingInvoice) beginEditInvoice()
                  setEditInvoicePrefix(e.target.value)
                }}
                onFocus={() => { if (!editingInvoice) beginEditInvoice() }}
              />
              <p className="text-xs text-muted-foreground">
                Invoices will be numbered as: {invoicePrefix || 'INV'}-XXXX
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextInvoiceNo" className="label-semibold">Next Invoice Number</Label>
              <Input
                id="nextInvoiceNo"
                className="input-focus-smooth"
                type="number"
                min={1}
                value={nextInvoiceNo}
                onChange={(e) => {
                  if (!editingInvoice) beginEditInvoice()
                  setEditNextInvoiceNo(e.target.value)
                }}
                onFocus={() => { if (!editingInvoice) beginEditInvoice() }}
              />
              <p className="text-xs text-muted-foreground">
                The next sale will use invoice number:{' '}
                <span className="font-mono font-semibold">
                  {invoicePrefix || 'INV'}-{nextInvoiceNo || '1'}
                </span>
              </p>
            </div>
            <div className="flex justify-end pt-2 gap-2">
              {editingInvoice && (
                <Button variant="outline" onClick={cancelEditInvoice} className="gap-2">
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleUpdateInvoice}
                disabled={updateInvoiceMutation.isPending || !editingInvoice}
                variant="outline"
                className="focus-ring-emerald gap-2"
              >
                {updateInvoiceMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Appearance Section ────────────────────────────────────────── */}
        <Card className="card-spotlight">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-lg bg-violet-50 p-2 dark:bg-violet-950/50">
                <Palette className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Switch between light and dark mode
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mounted && (
                  <>
                    <Sun
                      className={`h-4 w-4 ${
                        theme === 'light' ? 'text-amber-500' : 'text-muted-foreground'
                      }`}
                    />
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                    <Moon
                      className={`h-4 w-4 ${
                        theme === 'dark' ? 'text-violet-400' : 'text-muted-foreground'
                      }`}
                    />
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Display Name */}
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="label-semibold">Display Name</Label>
              <Input
                id="displayName"
                className="input-focus-smooth"
                placeholder="PharmPOS"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This name appears in the app header and browser tab
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Data Management Section ───────────────────────────────────── */}
        <Card className="card-spotlight lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-lg bg-amber-50 p-2 dark:bg-amber-950/50">
                <HardDrive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base">Data Management</CardTitle>
                <CardDescription>
                  Export, backup, and manage your pharmacy data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Export Data */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-lg bg-sky-50 p-2 dark:bg-sky-950/50">
                    <Download className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Export Data</p>
                    <p className="text-xs text-muted-foreground">
                      Export sales, medicines, and customer data as CSV
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleExportData}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Export Data
                </Button>
              </div>

              {/* Backup Database */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/50">
                    <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Backup Database</p>
                    <p className="text-xs text-muted-foreground">
                      Create a full backup of your pharmacy database
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleBackupDatabase}
                >
                  <Database className="h-3.5 w-3.5" />
                  Backup Database
                </Button>
              </div>
            </div>

            <Separator />

            {/* System Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">System Information</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-md bg-muted/50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">
                    {settings?.updatedAt
                      ? format(parseISO(settings.updatedAt), 'dd MMM yyyy, hh:mm a')
                      : '—'}
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Database</p>
                  <p className="text-sm font-medium">SQLite (Local)</p>
                </div>
                <div className="rounded-md bg-muted/50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="text-sm font-medium">PharmPOS v1.0.0</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
