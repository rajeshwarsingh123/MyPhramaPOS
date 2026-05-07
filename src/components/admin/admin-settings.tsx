'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  AlertTriangle,
  Save,
  Mail,
  Wrench,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Globe,
  Bell,
  Lock,
  Timer,
  List,
  KeyRound,
  Zap,
  Sparkles,
  Crown,
  Loader2,
  RotateCcw,
  Info,
} from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// ===================== TYPES =====================

interface AllSettings {
  // Platform
  platform_name: string
  platform_tagline: string
  support_email: string
  maintenance_mode: string
  max_free_medicines: string
  max_free_bills_per_day: string
  max_free_staff: string
  default_trial_days: string
  ai_scan_enabled: string
  // Email / Notification
  smtp_enabled: string
  notification_new_signup: string
  notification_subscription_expiry: string
  notification_ticket_creation: string
  // Security
  password_min_length: string
  two_factor_admins: string
  session_timeout: string
  ip_whitelist: string
  // Plan Configuration
  free_plan_features: string
  pro_plan_price_monthly: string
  pro_plan_price_yearly: string
  pro_plan_features: string
  // API
  api_rate_limit: string
  api_access_tenants: string
}

type SettingSection = 'platform' | 'email' | 'security' | 'plan' | 'api'

const SECTION_KEYS: Record<SettingSection, string[]> = {
  platform: [
    'platform_name',
    'platform_tagline',
    'support_email',
    'maintenance_mode',
    'max_free_medicines',
    'max_free_bills_per_day',
    'max_free_staff',
    'default_trial_days',
    'ai_scan_enabled',
  ],
  email: [
    'smtp_enabled',
    'notification_new_signup',
    'notification_subscription_expiry',
    'notification_ticket_creation',
  ],
  security: [
    'password_min_length',
    'two_factor_admins',
    'session_timeout',
    'ip_whitelist',
  ],
  api: ['api_rate_limit', 'api_access_tenants'],
}

const DEFAULTS: AllSettings = {
  platform_name: 'PharmPOS',
  platform_tagline: 'Smart Pharmacy Management',
  support_email: 'support@pharmpos.com',
  maintenance_mode: 'false',
  max_free_medicines: '50',
  max_free_bills_per_day: '100',
  max_free_staff: '1',
  default_trial_days: '14',
  ai_scan_enabled: 'true',
  smtp_enabled: 'false',
  notification_new_signup: 'true',
  notification_subscription_expiry: 'true',
  notification_ticket_creation: 'true',
  password_min_length: '8',
  two_factor_admins: 'false',
  session_timeout: '30',
  ip_whitelist: '',
  free_plan_features: '["billing","inventory","basic_reports","single_user"]',
  pro_plan_price_monthly: '999',
  pro_plan_price_yearly: '9990',
  pro_plan_features: '["billing","inventory","advanced_reports","ai_scan","bulk_import","export_reports","custom_branding","api_access","multi_user","priority_support"]',
  api_rate_limit: '60',
  api_access_tenants: 'false',
}

const SESSION_TIMEOUT_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
  { value: '480', label: '8 hours' },
  { value: '1440', label: '24 hours' },
]

const FREE_FEATURE_OPTIONS = [
  { id: 'billing', label: 'Billing & POS' },
  { id: 'inventory', label: 'Inventory Management' },
  { id: 'basic_reports', label: 'Basic Reports' },
  { id: 'single_user', label: 'Single User' },
  { id: 'multi_user', label: 'Multi User (up to 3)' },
  { id: 'ai_scan', label: 'AI Prescription Scan' },
  { id: 'export_reports', label: 'Export Reports' },
  { id: 'bulk_import', label: 'Bulk Import' },
  { id: 'custom_branding', label: 'Custom Branding' },
  { id: 'api_access', label: 'API Access' },
]

const PRO_FEATURE_OPTIONS = [
  { id: 'billing', label: 'Billing & POS' },
  { id: 'inventory', label: 'Inventory Management' },
  { id: 'advanced_reports', label: 'Advanced Reports & Analytics' },
  { id: 'ai_scan', label: 'AI Prescription Scan' },
  { id: 'bulk_import', label: 'Bulk Import' },
  { id: 'export_reports', label: 'Export Reports (PDF/Excel)' },
  { id: 'custom_branding', label: 'Custom Branding' },
  { id: 'api_access', label: 'API Access' },
  { id: 'multi_user', label: 'Multi User (Unlimited)' },
  { id: 'priority_support', label: 'Priority Support' },
]

function parseFeaturesList(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function featuresToString(arr: string[]): string {
  return JSON.stringify(arr)
}

// ===================== SECTION COMPONENT =====================

interface SectionProps {
  sectionKey: SettingSection
  title: string
  icon: React.ReactNode
  iconBg: string
  isLoading: boolean
  hasChanges: boolean
  isSaving: boolean
  onReset: () => void
  onSave: () => void
  children: React.ReactNode
}

function SettingsSectionCard({
  title,
  icon,
  iconBg,
  isLoading,
  hasChanges,
  isSaving,
  onReset,
  onSave,
  children,
}: SectionProps) {
  return (
    <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
              {icon}
            </div>
            {title}
            {hasChanges && (
              <Badge className="ml-2 bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0">
                Modified
              </Badge>
            )}
          </CardTitle>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button
                onClick={onReset}
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-white/40 hover:text-white/70 hover:bg-white/5"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button
                onClick={onSave}
                disabled={isSaving}
                size="sm"
                className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? <SectionSkeleton /> : children}
      </CardContent>
    </Card>
  )
}

// ===================== FIELD HELPERS =====================

function FieldRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-white/70 text-sm">{label}</Label>
      {description && <p className="text-[11px] text-white/40 mb-1">{description}</p>}
      {children}
    </div>
  )
}

function ToggleRow({
  icon,
  iconBg,
  label,
  description,
  checked,
  onCheckedChange,
  switchColor,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  switchColor?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', iconBg)}>
          {icon}
        </div>
        <div>
          <Label className="text-white/90 text-sm font-medium">{label}</Label>
          <p className="text-[11px] text-white/40 mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={switchColor ?? 'data-[state=checked]:bg-purple-600'}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
      <span className="text-sm text-white/60">{label}</span>
      <Badge variant="secondary" className="bg-white/5 text-white/70 border-white/10 text-xs">
        {value}
      </Badge>
    </div>
  )
}

// ===================== SKELETON =====================

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-24 mb-1 bg-white/5" />
          <Skeleton className="h-3 w-48 mb-2 bg-white/5" />
          <Skeleton className="h-9 w-full rounded-md bg-white/5" />
        </div>
      ))}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-52 bg-white/5" />
          <Skeleton className="h-4 w-72 mt-2 bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-5"
          >
            <Skeleton className="h-5 w-36 mb-5 bg-white/5" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j}>
                  <Skeleton className="h-3 w-20 mb-1 bg-white/5" />
                  <Skeleton className="h-3 w-48 mb-2 bg-white/5" />
                  <Skeleton className="h-9 w-full rounded-md bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================== MAIN COMPONENT =====================

export function AdminSettings() {
  const queryClient = useQueryClient()
  // Track local edits per section
  const [localEdits, setLocalEdits] = useState<Partial<AllSettings>>({})

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => fetch('/api/admin/settings').then((r) => r.json()),
  })

  const serverSettings: AllSettings = data?.settings
    ? { ...DEFAULTS, ...data.settings }
    : DEFAULTS

  const currentSettings: AllSettings = { ...serverSettings, ...localEdits }

  // Track which sections have changes
  const sectionHasChanges = useCallback(
    (section: SettingSection): boolean => {
      return SECTION_KEYS[section].some((key) => key in localEdits)
    },
    [localEdits],
  )

  const totalChanges = Object.keys(localEdits).length

  const updateField = useCallback(<K extends keyof AllSettings>(key: K, value: AllSettings[K]) => {
    setLocalEdits((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetSection = useCallback((section: SettingSection) => {
    const keys = SECTION_KEYS[section]
    setLocalEdits((prev) => {
      const next = { ...prev }
      for (const k of keys) {
        delete next[k]
      }
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setLocalEdits({})
  }, [])

  const saveSectionMutation = useMutation({
    mutationFn: async (section: SettingSection) => {
      const keys = SECTION_KEYS[section]
      const payload: Record<string, string> = {}
      for (const k of keys) {
        if (k in localEdits) {
          payload[k] = String(localEdits[k as keyof AllSettings])
        }
      }
      if (Object.keys(payload).length === 0) return
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      })
      if (!res.ok) throw new Error('Save failed')
      return res.json()
    },
    onSuccess: (_data, section) => {
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved`)
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      resetSection(section)
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: localEdits }),
      })
      if (!res.ok) throw new Error('Save failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('All settings saved successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      resetAll()
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const s = currentSettings

  // Feature toggles
  const freeFeatures = useMemo(() => parseFeaturesList(s.free_plan_features), [s.free_plan_features])
  const proFeatures = useMemo(() => parseFeaturesList(s.pro_plan_features), [s.pro_plan_features])

  const toggleFreeFeature = useCallback(
    (id: string) => {
      const next = freeFeatures.includes(id)
        ? freeFeatures.filter((f) => f !== id)
        : [...freeFeatures, id]
      updateField('free_plan_features', featuresToString(next))
    },
    [freeFeatures, updateField],
  )

  const toggleProFeature = useCallback(
    (id: string) => {
      const next = proFeatures.includes(id)
        ? proFeatures.filter((f) => f !== id)
        : [...proFeatures, id]
      updateField('pro_plan_features', featuresToString(next))
    },
    [proFeatures, updateField],
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load settings</p>
        <Button
          onClick={() => refetch()}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
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
          <p className="text-white/50 mt-1">
            Configure platform-wide settings, security, plans, and API access
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalChanges > 0 && (
            <>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                {totalChanges} change{totalChanges !== 1 ? 's' : ''}
              </Badge>
              <Button
                onClick={resetAll}
                variant="outline"
                className="border-white/10 text-white/60 hover:bg-white/5"
              >
                Discard All
              </Button>
              <Button
                onClick={() => saveAllMutation.mutate()}
                disabled={saveAllMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveAllMutation.isPending ? 'Saving...' : 'Save All'}
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ========== 1. PLATFORM SETTINGS ========== */}
          <SettingsSectionCard
            sectionKey="platform"
            title="Platform Settings"
            icon={<Globe className="h-4 w-4 text-purple-400" />}
            iconBg="bg-purple-500/15"
            isLoading={isLoading}
            hasChanges={sectionHasChanges('platform')}
            isSaving={saveSectionMutation.isPending}
            onReset={() => resetSection('platform')}
            onSave={() => saveSectionMutation.mutate('platform')}
          >
            {/* Platform Name */}
            <FieldRow label="Platform Name" description="Displayed across all tenant dashboards">
              <Input
                value={s.platform_name}
                onChange={(e) => updateField('platform_name', e.target.value)}
                className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30"
              />
            </FieldRow>

            <Separator className="bg-white/5" />

            {/* Tagline */}
            <FieldRow label="Platform Tagline" description="Subtitle shown in login and branding areas">
              <Input
                value={s.platform_tagline}
                onChange={(e) => updateField('platform_tagline', e.target.value)}
                className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30"
              />
            </FieldRow>

            <Separator className="bg-white/5" />

            {/* Support Email */}
            <FieldRow label="Support Email" description="Email address displayed to tenants for support">
              <Input
                type="email"
                value={s.support_email}
                onChange={(e) => updateField('support_email', e.target.value)}
                placeholder="support@pharmpos.com"
                className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/30"
              />
            </FieldRow>

            <Separator className="bg-white/5" />

            {/* Maintenance Mode */}
            <ToggleRow
              icon={<Wrench className="h-4 w-4 text-amber-400" />}
              iconBg="bg-amber-500/10"
              label="Maintenance Mode"
              description="Temporarily disable tenant access for system maintenance"
              checked={s.maintenance_mode === 'true'}
              onCheckedChange={(v) => updateField('maintenance_mode', String(v))}
              switchColor="data-[state=checked]:bg-amber-600"
            />
            {s.maintenance_mode === 'true' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300/80">
                  Warning: All tenants will see a maintenance page and will not be able to access the
                  application.
                </p>
              </div>
            )}

            <Separator className="bg-white/5" />

            {/* Max Free Tier Limits */}
            <div>
              <Label className="text-white/70 text-sm">Max Free Tier Limits</Label>
              <p className="text-[11px] text-white/40 mb-3">
                Limits applied to tenants on the free plan
              </p>
              <div className="grid grid-cols-3 gap-3">
                <FieldRow label="Medicines" description="">
                  <Input
                    type="number"
                    value={s.max_free_medicines}
                    onChange={(e) => updateField('max_free_medicines', e.target.value)}
                    className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white text-center"
                  />
                </FieldRow>
                <FieldRow label="Bills/Day" description="">
                  <Input
                    type="number"
                    value={s.max_free_bills_per_day}
                    onChange={(e) => updateField('max_free_bills_per_day', e.target.value)}
                    className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white text-center"
                  />
                </FieldRow>
                <FieldRow label="Staff Users" description="">
                  <Input
                    type="number"
                    value={s.max_free_staff}
                    onChange={(e) => updateField('max_free_staff', e.target.value)}
                    className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white text-center"
                  />
                </FieldRow>
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Default Trial Period */}
            <FieldRow
              label="Default Trial Period"
              description="Number of days new tenants get as a free trial of Pro features"
            >
              <div className="relative w-40">
                <Input
                  type="number"
                  value={s.default_trial_days}
                  onChange={(e) => updateField('default_trial_days', e.target.value)}
                  className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">
                  days
                </span>
              </div>
            </FieldRow>
          </SettingsSectionCard>

          {/* ========== 2. EMAIL / NOTIFICATION SETTINGS ========== */}
          <SettingsSectionCard
            sectionKey="email"
            title="Email & Notifications"
            icon={<Bell className="h-4 w-4 text-purple-400" />}
            iconBg="bg-purple-500/15"
            isLoading={isLoading}
            hasChanges={sectionHasChanges('email')}
            isSaving={saveSectionMutation.isPending}
            onReset={() => resetSection('email')}
            onSave={() => saveSectionMutation.mutate('email')}
          >
            {/* SMTP Toggle */}
            <ToggleRow
              icon={<Mail className="h-4 w-4 text-purple-400" />}
              iconBg="bg-purple-500/10"
              label="SMTP Email Service"
              description="Enable email delivery for notifications, invoices, and alerts"
              checked={s.smtp_enabled === 'true'}
              onCheckedChange={(v) => updateField('smtp_enabled', String(v))}
            />
            {s.smtp_enabled !== 'true' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <Info className="h-4 w-4 text-white/30 shrink-0" />
                <p className="text-xs text-white/30">
                  SMTP is disabled. Notifications will only be shown in-app.
                </p>
              </div>
            )}

            <Separator className="bg-white/5" />

            {/* Notification Preferences */}
            <div>
              <Label className="text-white/70 text-sm">Notification Preferences</Label>
              <p className="text-[11px] text-white/40 mb-3">
                Choose which events trigger notifications to admins
              </p>
              <div className="space-y-4">
                <ToggleRow
                  icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
                  iconBg="bg-emerald-500/10"
                  label="New Tenant Signup"
                  description="Notify admins when a new tenant registers on the platform"
                  checked={s.notification_new_signup === 'true'}
                  onCheckedChange={(v) => updateField('notification_new_signup', String(v))}
                />

                <Separator className="bg-white/5" />

                <ToggleRow
                  icon={<Timer className="h-4 w-4 text-amber-400" />}
                  iconBg="bg-amber-500/10"
                  label="Subscription Expiry"
                  description="Alert when a tenant subscription is about to expire (7 days before)"
                  checked={s.notification_subscription_expiry === 'true'}
                  onCheckedChange={(v) =>
                    updateField('notification_subscription_expiry', String(v))
                  }
                />

                <Separator className="bg-white/5" />

                <ToggleRow
                  icon={<Mail className="h-4 w-4 text-violet-400" />}
                  iconBg="bg-violet-500/10"
                  label="Support Ticket Creation"
                  description="Notify admins when a new support ticket is raised by a tenant"
                  checked={s.notification_ticket_creation === 'true'}
                  onCheckedChange={(v) =>
                    updateField('notification_ticket_creation', String(v))
                  }
                />
              </div>
            </div>
          </SettingsSectionCard>

          {/* ========== 3. SECURITY SETTINGS ========== */}
          <SettingsSectionCard
            sectionKey="security"
            title="Security Settings"
            icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
            iconBg="bg-emerald-500/15"
            isLoading={isLoading}
            hasChanges={sectionHasChanges('security')}
            isSaving={saveSectionMutation.isPending}
            onReset={() => resetSection('security')}
            onSave={() => saveSectionMutation.mutate('security')}
          >
            {/* Password Min Length */}
            <FieldRow
              label="Password Minimum Length"
              description="Minimum number of characters required for tenant passwords"
            >
              <div className="relative w-32">
                <Input
                  type="number"
                  min={6}
                  max={32}
                  value={s.password_min_length}
                  onChange={(e) => updateField('password_min_length', e.target.value)}
                  className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white text-center pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">
                  chars
                </span>
              </div>
            </FieldRow>

            <Separator className="bg-white/5" />

            {/* Two-Factor Auth for Admins */}
            <ToggleRow
              icon={<Shield className="h-4 w-4 text-emerald-400" />}
              iconBg="bg-emerald-500/10"
              label="Two-Factor Authentication"
              description="Require 2FA for all admin panel login attempts"
              checked={s.two_factor_admins === 'true'}
              onCheckedChange={(v) => updateField('two_factor_admins', String(v))}
            />

            <Separator className="bg-white/5" />

            {/* Session Timeout */}
            <FieldRow
              label="Session Timeout"
              description="Duration of inactivity before admin sessions expire"
            >
              <Select
                value={s.session_timeout}
                onValueChange={(v) => updateField('session_timeout', v)}
              >
                <SelectTrigger className="w-44 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
                  <Timer className="h-4 w-4 mr-2 text-white/40" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)]">
                  {SESSION_TIMEOUT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <Separator className="bg-white/5" />

            {/* IP Whitelist */}
            <FieldRow
              label="IP Whitelist"
              description="Restrict admin panel access to specific IPs (one per line). Leave empty for no restriction."
            >
              <Textarea
                value={s.ip_whitelist}
                onChange={(e) => updateField('ip_whitelist', e.target.value)}
                placeholder={"192.168.1.100\n10.0.0.1\n203.0.113.50"}
                className="min-h-[100px] bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white placeholder:text-white/20 text-xs font-mono resize-none"
              />
              {s.ip_whitelist && (
                <p className="text-[10px] text-white/30 mt-1">
                  {s.ip_whitelist.split('\n').filter((ip) => ip.trim()).length} IP address(es)
                  configured
                </p>
              )}
            </FieldRow>
          </SettingsSectionCard>


          {/* ========== 5. API SETTINGS ========== */}
          <SettingsSectionCard
            sectionKey="api"
            title="API Settings"
            icon={<Zap className="h-4 w-4 text-amber-400" />}
            iconBg="bg-amber-500/15"
            isLoading={isLoading}
            hasChanges={sectionHasChanges('api')}
            isSaving={saveSectionMutation.isPending}
            onReset={() => resetSection('api')}
            onSave={() => saveSectionMutation.mutate('api')}
          >
            {/* API Rate Limit */}
            <FieldRow
              label="API Rate Limit"
              description="Maximum number of API requests allowed per minute per tenant"
            >
              <div className="relative w-48">
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={s.api_rate_limit}
                  onChange={(e) => updateField('api_rate_limit', e.target.value)}
                  className="bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white pr-24"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">
                  req/min
                </span>
              </div>
            </FieldRow>

            <Separator className="bg-white/5" />

            {/* API Access Toggle */}
            <ToggleRow
              icon={<KeyRound className="h-4 w-4 text-amber-400" />}
              iconBg="bg-amber-500/10"
              label="Tenant API Access"
              description="Allow tenants to use the REST API for integrations and custom workflows"
              checked={s.api_access_tenants === 'true'}
              onCheckedChange={(v) => updateField('api_access_tenants', String(v))}
              switchColor="data-[state=checked]:bg-amber-600"
            />
            {s.api_access_tenants !== 'true' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <Info className="h-4 w-4 text-white/30 shrink-0" />
                <p className="text-xs text-white/30">
                  API access is disabled. Tenants will not be able to generate API keys or make API
                  requests.
                </p>
              </div>
            )}

            <Separator className="bg-white/5" />

            {/* System Info */}
            <div className="pt-1">
              <Label className="text-white/70 text-sm mb-3 block">System Information</Label>
              <div className="space-y-2">
                <InfoRow label="Platform Version" value="PharmPOS v1.0.0" />
                <InfoRow label="Database" value="SQLite" />
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-sm text-white/60">Status</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5" />
                    System Active
                  </Badge>
                </div>
                {data?.settings && (
                  <InfoRow
                    label="Settings Count"
                    value={`${Object.keys(data.settings).length} keys`}
                  />
                )}
              </div>
            </div>
          </SettingsSectionCard>
        </div>
      )}
    </div>
  )
}
