'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Target, TrendingUp, PartyPopper, Settings2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

// ── Types ───────────────────────────────────────────────────────────────────

interface SalesTargetData {
  target: number
  actual: number
  percentage: number
  remaining: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  const safeAmount = typeof amount === 'number' ? amount : 0
  return '\u20B9' + safeAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function getColorConfig(percentage: number) {
  if (percentage >= 100) {
    return {
      ring: '#22c55e',
      track: 'rgba(34, 197, 94, 0.15)',
      text: 'text-green-600 dark:text-green-400',
      badge: 'badge-glow-green',
      label: 'Target Achieved!',
      bg: 'bg-green-50 dark:bg-green-950/30',
    }
  }
  if (percentage >= 80) {
    return {
      ring: '#10b981',
      track: 'rgba(16, 185, 129, 0.15)',
      text: 'text-emerald-600 dark:text-emerald-400',
      badge: 'badge-glow-green',
      label: 'Almost there!',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    }
  }
  if (percentage >= 50) {
    return {
      ring: '#f59e0b',
      track: 'rgba(245, 158, 11, 0.15)',
      text: 'text-amber-600 dark:text-amber-400',
      badge: 'badge-glow-amber',
      label: 'Keep going!',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    }
  }
  return {
    ring: '#ef4444',
    track: 'rgba(239, 68, 68, 0.15)',
    text: 'text-red-600 dark:text-red-400',
    badge: 'badge-glow-red',
    label: 'Needs effort',
    bg: 'bg-red-50 dark:bg-red-950/30',
  }
}

// ── Circular Progress Ring ──────────────────────────────────────────────────

function CircularProgressRing({
  percentage,
  size = 120,
  strokeWidth = 8,
  color,
}: {
  percentage: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPercentage = Math.min(percentage, 100)
  const offset = circumference - (clampedPercentage / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/50"
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </svg>
  )
}

// ── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0)
  const startRef = useRef(0)
  const rafRef = useRef<number>(0)

  const animate = useCallback(
    (from: number, to: number) => {
      const startTime = performance.now()
      const diff = to - from

      function step(timestamp: number) {
        const elapsed = timestamp - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setCurrent(Math.round(from + diff * eased))

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step)
        }
      }

      rafRef.current = requestAnimationFrame(step)
    },
    [duration]
  )

  useEffect(() => {
    if (target !== startRef.current) {
      const prev = startRef.current
      startRef.current = target
      animate(prev, target)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, animate])

  return <>{current}</>
}

// ── Set Target Dialog ───────────────────────────────────────────────────────

function SetTargetDialog({ currentTarget }: { currentTarget: number }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState((currentTarget ?? 0).toString())
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async (newTarget: number) => {
      const res = await fetch('/api/dashboard/sales-target', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: newTarget }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update target')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Target updated!', { description: 'Daily sales target has been updated.' })
      queryClient.invalidateQueries({ queryKey: ['sales-target'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setOpen(false)
    },
    onError: (err: Error) => {
      toast.error('Failed to update', { description: err.message })
    },
  })

  function handleSave() {
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) {
      toast.error('Invalid amount', { description: 'Please enter a positive number.' })
      return
    }
    updateMutation.mutate(num)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setValue((currentTarget ?? 0).toString()) }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-7 px-2"
        >
          <Settings2 className="h-3 w-3" />
          Set Target
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-teal-600" />
            Set Daily Sales Target
          </DialogTitle>
          <DialogDescription>
            Set your daily revenue goal to track progress throughout the day.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="target-input">Target Amount (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₹
              </span>
              <Input
                id="target-input"
                type="number"
                min={1}
                step={1000}
                placeholder="10000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                }}
                className="pl-7"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Current: {formatCurrency(currentTarget)} per day
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1 sm:flex-none bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            Save Target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Widget ─────────────────────────────────────────────────────────────

export function DailyTargetWidget() {
  const { data, isLoading, error } = useQuery<SalesTargetData>({
    queryKey: ['sales-target'],
    queryFn: () => fetch('/api/dashboard/sales-target').then((r) => r.json()),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <Card className="card-spotlight card-elevated rounded-xl overflow-hidden">
        <CardContent className="p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Skeleton className="h-[120px] w-[120px] rounded-full shrink-0" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="card-spotlight card-elevated rounded-xl overflow-hidden border-destructive/50">
        <CardContent className="p-4 lg:p-5 text-center">
          <p className="text-sm text-destructive">Failed to load sales target.</p>
        </CardContent>
      </Card>
    )
  }

  const percentage = Math.round(data?.percentage ?? 0)
  const config = getColorConfig(percentage)
  const isCelebration = percentage >= 100

  return (
    <Card className="card-spotlight card-elevated rounded-xl overflow-hidden relative group transition-all duration-300 hover:shadow-lg">
      {/* Celebration confetti effect */}
      {isCelebration && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          <div className="absolute -top-2 -right-2 animate-bounce">
            <PartyPopper className="h-6 w-6 text-amber-500 opacity-70" />
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none bg-gradient-to-br from-teal-500 to-emerald-500" />

      <CardContent className="relative p-4 lg:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight">Daily Target</h3>
              <p className="text-[11px] text-muted-foreground">Today&apos;s progress</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn('text-[10px] font-semibold gap-1 px-2 h-6', config.badge)}>
              {isCelebration && <span className="text-xs">🎉</span>}
              {config.label}
            </Badge>
            <SetTargetDialog currentTarget={data?.target ?? 0} />
          </div>
        </div>

        {/* Progress Ring + Stats */}
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Circular progress ring */}
          <div className="relative shrink-0">
            <CircularProgressRing
              percentage={data?.percentage ?? 0}
              size={110}
              strokeWidth={8}
              color={config.ring}
            />
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-2xl font-bold tabular-nums leading-none', config.text)}>
                <AnimatedCounter target={percentage} />
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Target */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Target
              </p>
              <p className="text-base font-bold gradient-text-teal tabular-nums">
                {formatCurrency(data?.target ?? 0)}
              </p>
            </div>

            {/* Today's Sales */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Today&apos;s Sales
              </p>
              <div className="flex items-center gap-1.5">
                <TrendingUp className={cn('h-3.5 w-3.5', config.text)} />
                <p className={cn('text-base font-bold tabular-nums', config.text)}>
                  {formatCurrency(data?.actual ?? 0)}
                </p>
              </div>
            </div>

            {/* Remaining */}
            {(data?.remaining ?? 0) > 0 ? (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Remaining
                </p>
                <p className="text-sm font-semibold text-muted-foreground tabular-nums">
                  {formatCurrency(data?.remaining ?? 0)}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Exceeded by
                </p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">
                  +{formatCurrency((data?.actual ?? 0) - (data?.target ?? 0))}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar at bottom */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">Progress</span>
            <span className={cn('text-[10px] font-bold tabular-nums', config.text)}>
              {formatCurrency(data?.actual ?? 0)} / {formatCurrency(data?.target ?? 0)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(data?.percentage ?? 0, 100)}%`,
                backgroundColor: config.ring,
              }}
            />
          </div>
        </div>
      </CardContent>

      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 h-[3px] w-3/4 transition-all duration-500 group-hover:w-full rounded-full"
        style={{ backgroundColor: config.ring }}
      />
    </Card>
  )
}
