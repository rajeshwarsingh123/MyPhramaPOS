'use client'

import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/30 px-4 lg:px-6">
      <div className="flex h-10 items-center justify-between text-xs text-muted-foreground">
        {/* Left: Copyright */}
        <span className="hidden sm:inline truncate">
          &copy; 2026 PharmPOS. Pharmacy Billing &amp; Inventory Management
        </span>
        <span className="sm:hidden truncate">
          &copy; 2026 PharmPOS
        </span>

        {/* Center: Powered by AI */}
        <span className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1 text-muted-foreground/70">
          <Sparkles className="h-3 w-3" />
          Powered by AI
        </span>

        {/* Right: Version badge */}
        <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 bg-background/50">
          v2.1.0
        </Badge>
      </div>
    </footer>
  )
}
