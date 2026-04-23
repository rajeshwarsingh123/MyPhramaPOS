'use client'

import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Receipt,
  Plus,
  ShoppingCart,
  BarChart3,
  Download,
  DatabaseBackup,
  type LucideIcon,
} from 'lucide-react'

// ── Helpers ─────────────────────────────────────────────────────────────────

function downloadFile(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── Action Definitions ─────────────────────────────────────────────────────

interface QuickAction {
  id: string
  label: string
  description: string
  icon: LucideIcon
  iconBg: string
  iconText: string
  hoverBorder: string
  accentFrom: string
  accentTo: string
  onClick: () => void
}

export function QuickActionsWidget() {
  const { setCurrentPage } = useAppStore()

  const actions: QuickAction[] = [
    {
      id: 'new-sale',
      label: 'New Sale',
      description: 'Create a new bill',
      icon: Receipt,
      iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
      iconText: 'text-white',
      hoverBorder: 'hover:border-teal-300 dark:hover:border-teal-700',
      accentFrom: 'from-teal-500',
      accentTo: 'to-teal-300',
      onClick: () => setCurrentPage('billing'),
    },
    {
      id: 'add-medicine',
      label: 'Add Medicine',
      description: 'Add to inventory',
      icon: Plus,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      iconText: 'text-white',
      hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      accentFrom: 'from-emerald-500',
      accentTo: 'to-emerald-300',
      onClick: () => setCurrentPage('medicines'),
    },
    {
      id: 'new-purchase',
      label: 'New Purchase',
      description: 'Record purchase order',
      icon: ShoppingCart,
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
      iconText: 'text-white',
      hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
      accentFrom: 'from-amber-500',
      accentTo: 'to-amber-300',
      onClick: () => setCurrentPage('purchases'),
    },
    {
      id: 'view-reports',
      label: 'View Reports',
      description: 'Analytics & insights',
      icon: BarChart3,
      iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600',
      iconText: 'text-white',
      hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700',
      accentFrom: 'from-rose-500',
      accentTo: 'to-rose-300',
      onClick: () => setCurrentPage('reports'),
    },
    {
      id: 'export-data',
      label: 'Export Data',
      description: 'Download medicines CSV',
      icon: Download,
      iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
      iconText: 'text-white',
      hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-700',
      accentFrom: 'from-violet-500',
      accentTo: 'to-violet-300',
      onClick: () =>
        downloadFile(
          '/api/export?type=medicines&format=csv',
          'medicines_export.csv',
        ),
    },
    {
      id: 'backup-db',
      label: 'Backup DB',
      description: 'Download database backup',
      icon: DatabaseBackup,
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconText: 'text-white',
      hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
      accentFrom: 'from-blue-500',
      accentTo: 'to-blue-300',
      onClick: () => downloadFile('/api/backup', 'pharmpos_backup.sqlite'),
    },
  ]

  return (
    <Card className="card-elevated rounded-xl overflow-hidden animate-fade-up section-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
            <ZapIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            <CardDescription className="text-xs">
              Common pharmacy operations
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={cn(
                'action-card-hover hover-lift card-spotlight group relative flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 lg:p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.05] active:scale-[0.98]',
                action.hoverBorder,
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon */}
              <div
                className={cn(
                  'flex items-center justify-center rounded-2xl w-11 h-11 shadow-sm transition-all duration-200 group-hover:scale-110',
                  action.iconBg,
                  action.iconText,
                )}
              >
                <action.icon className="h-5 w-5" />
              </div>

              {/* Text */}
              <div className="flex flex-col items-center gap-0.5 min-w-0">
                <span className="text-xs font-semibold text-foreground">
                  {action.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {action.description}
                </span>
              </div>

              {/* Bottom accent bar */}
              <div
                className={cn(
                  'absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500 rounded-full bg-gradient-to-r',
                  action.accentFrom,
                  action.accentTo,
                )}
              />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Small Zap icon (inline to avoid extra import) ─────────────────────────

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  )
}
