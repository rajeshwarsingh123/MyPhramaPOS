'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { Cross, Clock, Wifi, HelpCircle, Shield, Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

function useLiveClock() {
  const [time, setTime] = useState(() => {
    const now = new Date()
    return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))
    }, 60000) // update every minute
    return () => clearInterval(interval)
  }, [])

  return time
}

export function Footer() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const time = useLiveClock()

  return (
    <footer className="mt-auto relative glass-footer footer-gradient-border shrink-0">
      <div className="flex items-center justify-between px-4 lg:px-6 h-12 gap-3">
        {/* Left Section - Copyright & Branding */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gradient-to-br from-primary/15 to-primary/5 shrink-0 shadow-sm">
            <Cross className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-foreground/80 hidden sm:inline truncate">
              &copy; {new Date().getFullYear()} PharmPOS
            </span>
            <span className="text-xs font-medium text-foreground/80 sm:hidden">
              &copy; {new Date().getFullYear()} PharmPOS
            </span>
          </div>
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-muted-foreground/40">
            <Heart className="h-2.5 w-2.5 text-red-400/60" />
          </span>
        </div>

        {/* Center Section - Status */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="relative">
              <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 footer-status-dot" />
            </div>
            <span className="font-medium">System Active</span>
            <span className="text-muted-foreground/30">|</span>
            <div className="relative">
              <Wifi className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary footer-status-dot" />
            </div>
            <span className="font-medium">Connected</span>
          </div>

          {/* Mobile simplified status */}
          <div className="flex md:hidden items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium">Active</span>
          </div>
        </div>

        {/* Right Section - Time, Version & Help */}
        <div className="flex items-center gap-2.5 shrink-0">
          {mounted && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums tracking-tight">{time}</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1 text-muted-foreground/20">
            <span>·</span>
          </div>

          <Badge
            variant="outline"
            className="text-[10px] font-semibold h-5 px-1.5 footer-version-badge text-primary/80"
          >
            v2.1.0
          </Badge>

          <a
            href="#"
            className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-primary footer-link-hover"
            title="Help & Documentation"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Bottom branding bar - mobile only */}
      <div className="sm:hidden flex items-center justify-center gap-1 pb-1.5 text-[10px] text-muted-foreground/40">
        <Cross className="h-2.5 w-2.5 text-primary/50" strokeWidth={2.5} />
        <span>Powered by PharmPOS</span>
      </div>
    </footer>
  )
}
