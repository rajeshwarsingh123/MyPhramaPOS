'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  AlertTriangle,
  Save,
  DollarSign,
  Brain,
  Mail,
  Wrench,
  Shield,
  CheckCircle2,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface PlatformSettings {
  freePlanPrice: string
  proPlanPrice: string
  freeMedicineLimit: string
  aiScanEnabled: boolean
  supportEmail: string
  maintenanceMode: boolean
}

const defaultSettings: PlatformSettings = {
  freePlanPrice: '0',
  proPlanPrice: '999',
  freeMedicineLimit: '50',
  aiScanEnabled: true,
  supportEmail: 'support@pharmpos.com',
  maintenanceMode: false,
}

function parseServerSettings(s: Record<string, unknown>): PlatformSettings {
  return {
    freePlanPrice: String(s.freePlanPrice ?? '0'),
    proPlanPrice: String(s.proPlanPrice ?? '999'),
    freeMedicineLimit: String(s.freeMedicineLimit ?? '50'),
    aiScanEnabled: Boolean(s.aiScanEnabled ?? true),
    supportEmail: String(s.supportEmail ?? 'support@pharmpos.com'),
    maintenanceMode: Boolean(s.maintenanceMode ?? false),
  }
}

export function AdminSettings() {
  const queryClient = useQueryClient()
  // Track local user edits as a partial overlay (null = no edits)
  const [localEdits, setLocalEdits] = useState<Partial<PlatformSettings> | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => fetch('/api/admin/settings').then((r) => r.json()),
  })

  // Derive current settings: server data merged with local edits
  const serverSettings: PlatformSettings = data?.settings
    ? parseServerSettings(data.settings)
    : defaultSettings

  const currentSettings: PlatformSettings = { ...serverSettings, ...localEdits }
  const hasChanges = localEdits !== null

  const saveMutation = useMutation({
    mutationFn: async (settings: PlatformSettings) => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Save failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Settings saved successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      setLocalEdits(null)
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const updateField = useCallback(<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setLocalEdits((prev) => ({ ...(prev ?? {}), [key]: value }))
  }, [])

  const handleSave = () => {
    saveMutation.mutate(currentSettings)
  }

  const handleReset = () => {
    setLocalEdits(null)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load settings</p>
        <Button onClick={() => refetch()} className="bg-purple-600 hover:bg-purple-700 text-white">
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
            <Settings className="h-7 w-7 text-purple-400" />
            Platform Settings
          </h1>
          <p className="text-white/50 mt-1">Configure platform-wide settings and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button onClick={handleReset} variant="outline" className="border-white/10 text-white/60 hover:bg-white/5">
              Discard
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !hasChanges}
            className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SettingsSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pricing Settings */}
          <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-400" />
                Pricing Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-white/70 text-sm">Free Plan Price</Label>
                  <span className="text-xs text-white/30">₹/month</span>
                </div>
                <p className="text-[11px] text-white/40 mb-1">Set to 0 for completely free tier</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">₹</span>
                  <Input
                    type="number"
                    value={currentSettings.freePlanPrice}
                    onChange={(e) => updateField('freePlanPrice', e.target.value)}
                    className="pl-7 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
                  />
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-white/70 text-sm">Pro Plan Price</Label>
                  <span className="text-xs text-white/30">₹/month</span>
                </div>
                <p className="text-[11px] text-white/40 mb-1">Monthly subscription price for Pro features</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">₹</span>
                  <Input
                    type="number"
                    value={currentSettings.proPlanPrice}
                    onChange={(e) => updateField('proPlanPrice', e.target.value)}
                    className="pl-7 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
                  />
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Free Medicine Limit</Label>
                <p className="text-[11px] text-white/40 mb-1">Maximum medicines allowed on Free plan</p>
                <Input
                  type="number"
                  value={currentSettings.freeMedicineLimit}
                  onChange={(e) => updateField('freeMedicineLimit', e.target.value)}
                  className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-400" />
                Feature Toggles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* AI Scan Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <Label className="text-white/90 text-sm font-medium">AI Scan</Label>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Enable AI-powered medicine scanning for all tenants
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentSettings.aiScanEnabled}
                  onCheckedChange={(checked) => updateField('aiScanEnabled', checked)}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>

              <Separator className="bg-white/5" />

              {/* Maintenance Mode */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Wrench className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <Label className="text-white/90 text-sm font-medium">Maintenance Mode</Label>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Temporarily disable tenant access for system maintenance
                    </p>
                    {currentSettings.maintenanceMode && (
                      <Badge className="mt-2 bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                        ⚠ Maintenance Active
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={currentSettings.maintenanceMode}
                  onCheckedChange={(checked) => updateField('maintenanceMode', checked)}
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Support Settings */}
          <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-400" />
                Support Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Support Email</Label>
                <p className="text-[11px] text-white/40 mb-1">
                  Email address displayed to tenants for support requests
                </p>
                <Input
                  type="email"
                  value={currentSettings.supportEmail}
                  onChange={(e) => updateField('supportEmail', e.target.value)}
                  placeholder="support@pharmpos.com"
                  className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30"
                />
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-sm text-white/60">Platform Version</span>
                <Badge variant="secondary" className="bg-white/5 text-white/70 border-white/10 text-xs">
                  PharmPOS v1.0.0
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-sm text-white/60">Database</span>
                <Badge variant="secondary" className="bg-white/5 text-white/70 border-white/10 text-xs">
                  SQLite
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-sm text-white/60">Status</span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                  ● System Active
                </Badge>
              </div>
              {data?.settings?.updatedAt && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-sm text-white/60">Last Updated</span>
                  <span className="text-xs text-white/40">
                    {new Date(data.settings.updatedAt).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-5">
          <Skeleton className="h-5 w-36 mb-5 bg-white/5" />
          <div className="space-y-4">
            <div>
              <Skeleton className="h-3 w-20 mb-1 bg-white/5" />
              <Skeleton className="h-3 w-48 mb-2 bg-white/5" />
              <Skeleton className="h-9 w-full rounded-md bg-white/5" />
            </div>
            <Skeleton className="h-px w-full bg-white/5" />
            <div>
              <Skeleton className="h-3 w-20 mb-1 bg-white/5" />
              <Skeleton className="h-3 w-48 mb-2 bg-white/5" />
              <Skeleton className="h-9 w-full rounded-md bg-white/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
