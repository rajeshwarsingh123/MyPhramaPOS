'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Megaphone, 
  X, 
  Info, 
  AlertCircle, 
  Wrench, 
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Announcement {
  id: string
  title: string
  message: string
  type: string
}

export function AnnouncementBanner() {
  const [closedIds, setClosedIds] = useState<string[]>([])
  const { data, isLoading } = useQuery({
    queryKey: ['public-announcements'],
    queryFn: () => fetch('/api/announcements').then((r) => r.json()),
    refetchInterval: 300000, // 5 minutes
  })

  const announcements: Announcement[] = (data?.announcements ?? []).filter(
    (a: Announcement) => !closedIds.includes(a.id)
  )

  if (isLoading || announcements.length === 0) return null

  const current = announcements[0]

  const typeConfig: Record<string, { bg: string, text: string, icon: any, border: string }> = {
    info: { 
      bg: 'bg-blue-500/10', 
      text: 'text-blue-600 dark:text-blue-400', 
      border: 'border-blue-500/20',
      icon: Info 
    },
    warning: { 
      bg: 'bg-amber-500/10', 
      text: 'text-amber-600 dark:text-amber-400', 
      border: 'border-amber-500/20',
      icon: AlertCircle 
    },
    maintenance: { 
      bg: 'bg-red-500/10', 
      text: 'text-red-600 dark:text-red-400', 
      border: 'border-red-500/20',
      icon: Wrench 
    },
    promotion: { 
      bg: 'bg-purple-500/10', 
      text: 'text-purple-600 dark:text-purple-400', 
      border: 'border-purple-500/20',
      icon: Sparkles 
    },
  }

  const config = typeConfig[current.type] || typeConfig.info
  const Icon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={cn(
          'relative w-full border-b overflow-hidden',
          config.bg,
          config.border
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap">
            <div className="w-0 flex-1 flex items-center">
              <span className={cn('flex p-1.5 rounded-lg', config.bg)}>
                <Icon className={cn('h-4 w-4', config.text)} aria-hidden="true" />
              </span>
              <p className="ml-3 font-medium text-sm truncate">
                <span className={cn('font-bold mr-2 uppercase text-[10px] tracking-wider', config.text)}>
                  {current.type}:
                </span>
                <span className="text-foreground/90">{current.title}</span>
                <span className="mx-2 text-foreground/30 hidden sm:inline">•</span>
                <span className="hidden md:inline text-foreground/60 text-xs">{current.message}</span>
              </p>
            </div>
            
            <div className="flex-shrink-0 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                onClick={() => {
                  // Logic to show full announcement could go here
                }}
              >
                View Details
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
              <button
                type="button"
                className="flex p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none transition-colors"
                onClick={() => setClosedIds([...closedIds, current.id])}
              >
                <X className="h-4 w-4 text-foreground/40" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
