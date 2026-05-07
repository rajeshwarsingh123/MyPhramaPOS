'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ScrollText,
  RefreshCw,
  AlertTriangle,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  AlertCircle,
  LogIn,
  FileText,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'

interface LogEntry {
  id: string
  tenantId: string | null
  action: string
  details: string | null
  createdAt: string
  tenant: { id: string; businessName: string; name: string; email: string } | null
  level: string
}

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function LevelDot({ level }: { level: string }) {
  const config: Record<string, string> = {
    error: 'bg-red-400',
    warning: 'bg-amber-400',
    login: 'bg-blue-400',
    create: 'bg-emerald-400',
    update: 'bg-primary/80',
    info: 'bg-gray-400',
  }
  return (
    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', config[level] ?? 'bg-gray-400')} />
  )
}

function LevelIcon({ level }: { level: string }) {
  switch (level) {
    case 'error':
      return <ShieldAlert className="h-5 w-5 text-red-400" />
    case 'warning':
      return <AlertCircle className="h-5 w-5 text-amber-400" />
    case 'login':
      return <LogIn className="h-5 w-5 text-blue-400" />
    default:
      return <FileText className="h-5 w-5 text-gray-400" />
  }
}

export function AdminLogs() {
  const [actionFilter, setActionFilter] = useState('all')
  const [tenantSearch, setTenantSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [autoRefreshKey, setAutoRefreshKey] = useState(0)

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefreshKey((k) => k + 1)
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (actionFilter !== 'all') params.set('action', actionFilter)
    if (fromDate) params.set('fromDate', fromDate)
    if (toDate) params.set('toDate', toDate)
    params.set('page', String(page))
    params.set('limit', '30')
    params.set('_refresh', String(autoRefreshKey))
    return params.toString()
  }, [actionFilter, fromDate, toDate, page, autoRefreshKey])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-logs', queryParams],
    queryFn: () => fetch(`/api/admin/logs?${queryParams}`).then((r) => r.json()),
  })

  const logs: LogEntry[] = data?.logs ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 30, total: 0, totalPages: 0 }
  const summary = data?.summary ?? { total: 0, errors: 0, warnings: 0, logins: 0 }

  // Client-side tenant search filtering
  const filteredLogs = useMemo(() => {
    if (!tenantSearch.trim()) return logs
    const q = tenantSearch.toLowerCase()
    return logs.filter(
      (log) =>
        log.tenant?.businessName?.toLowerCase().includes(q) ||
        log.tenant?.name?.toLowerCase().includes(q) ||
        log.tenant?.email?.toLowerCase().includes(q),
    )
  }, [logs, tenantSearch])

  const hasFilters = actionFilter !== 'all' || fromDate || toDate || tenantSearch

  const resetFilters = () => {
    setActionFilter('all')
    setTenantSearch('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-white/70">Failed to load system logs</p>
        <Button onClick={() => refetch()} className="bg-primary hover:bg-primary/80 text-white">
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
            <ScrollText className="h-7 w-7 text-primary" />
            System Logs
          </h1>
          <p className="text-white/50 mt-1">
            {summary.total} total events &middot; Auto-refreshes every 60s
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-white/40">Total Logs</p>
          </div>
          <p className="text-2xl font-bold text-white">{summary.total.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-xs text-white/40">Errors</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{summary.errors.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-xs text-white/40">Warnings</p>
          </div>
          <p className="text-2xl font-bold text-amber-400">{summary.warnings.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <LogIn className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-xs text-white/40">Login Events</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">{summary.logins.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
            <Filter className="h-4 w-4 mr-2 text-white/40" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent className="bg-[oklch(0.18_0.02_250)] border-[oklch(0.28_0.03_250)] text-white">
            <SelectItem value="all" className="focus:bg-white/10 focus:text-white text-white">All Actions</SelectItem>
            <SelectItem value="login" className="focus:bg-white/10 focus:text-white text-white">Login</SelectItem>
            <SelectItem value="error" className="focus:bg-white/10 focus:text-white text-white">Error</SelectItem>
            <SelectItem value="warning" className="focus:bg-white/10 focus:text-white text-white">Warning</SelectItem>
            <SelectItem value="update" className="focus:bg-white/10 focus:text-white text-white">Update</SelectItem>
            <SelectItem value="create" className="focus:bg-white/10 focus:text-white text-white">Create</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={tenantSearch}
          onChange={(e) => setTenantSearch(e.target.value)}
          className="w-48 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
          placeholder="Search tenant..."
        />

        <Input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
          className="w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
          placeholder="From"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1) }}
          className="w-40 bg-[oklch(0.14_0.02_250)] border-[oklch(0.28_0.03_250)] text-white"
          placeholder="To"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-white/40 hover:text-white/70">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Log Timeline */}
      <Card className="bg-[oklch(0.18_0.02_250)] border border-[oklch(0.28_0.03_250)] rounded-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <LogsSkeleton />
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <ScrollText className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">No logs found</p>
              <p className="text-xs mt-1">Adjust the filters or wait for new events</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredLogs.map((log) => {
                const isExpanded = expandedId === log.id
                return (
                  <div key={log.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Level Dot */}
                      <div className="mt-1.5">
                        <LevelDot level={log.level} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/80 font-medium truncate">{log.action}</p>
                            {log.details && !isExpanded && (
                              <p className="text-xs text-white/40 truncate mt-0.5">{log.details}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              {log.tenant && (
                                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                  {log.tenant.businessName || log.tenant.name}
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-[10px] border',
                                  log.level === 'error' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                                  log.level === 'warning' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                                  log.level === 'login' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                                  log.level === 'create' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                                  log.level === 'update' ? 'bg-primary/10 text-primary border-primary/20' :
                                  'bg-gray-500/10 text-gray-300 border-gray-500/20'
                                )}
                              >
                                {log.level}
                              </Badge>
                            </div>
                          </div>

                          {/* Right: timestamp + expand */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-white/30 whitespace-nowrap">
                              {getRelativeTime(log.createdAt)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-white/30" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-white/30" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-white/30">Log ID:</span>
                                <span className="text-white/50 ml-2 font-mono">{log.id.slice(0, 12)}...</span>
                              </div>
                              {log.tenantId && (
                                <div>
                                  <span className="text-white/30">Tenant ID:</span>
                                  <span className="text-white/50 ml-2 font-mono">{log.tenantId.slice(0, 12)}...</span>
                                </div>
                              )}
                              {log.tenant && (
                                <div>
                                  <span className="text-white/30">Business:</span>
                                  <span className="text-white/50 ml-2">{log.tenant.businessName}</span>
                                </div>
                              )}
                              {log.tenant && (
                                <div>
                                  <span className="text-white/30">Email:</span>
                                  <span className="text-white/50 ml-2">{log.tenant.email}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-white/30">Full Time:</span>
                                <span className="text-white/50 ml-2">
                                  {new Date(log.createdAt).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                            {log.details && (
                              <div>
                                <span className="text-white/30 text-xs">Details:</span>
                                <p className="text-white/60 text-xs mt-1 whitespace-pre-wrap break-all">{log.details}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-white/10 text-white/70 hover:bg-white/5"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-white/10 text-white/70 hover:bg-white/5"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function LogsSkeleton() {
  return (
    <div className="divide-y divide-white/5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="w-2.5 h-2.5 rounded-full bg-white/5 mt-2" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4 bg-white/5" />
            <Skeleton className="h-3 w-1/2 bg-white/5" />
            <Skeleton className="h-4 w-24 rounded-full bg-white/5" />
          </div>
          <Skeleton className="h-3 w-16 bg-white/5" />
        </div>
      ))}
    </div>
  )
}
