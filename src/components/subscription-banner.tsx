'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SubscriptionBanner() {
  const { currentTenant, setCurrentPage, currentPage } = useAppStore()

  const { data: sub } = useQuery({
    queryKey: ['subscription', currentTenant?.id],
    queryFn: () => fetch('/api/subscription/status').then(res => res.json()),
    enabled: !!currentTenant?.id,
    refetchInterval: 1000 * 60 * 30 // Refetch every 30 mins
  })

  if (!sub || sub.status === 'suspended' || currentPage === 'subscription') return null

  const daysLeft = sub.daysLeft ?? 0
  const isExpired = daysLeft <= 0

  if (daysLeft > 30 && !isExpired) return null

  return (
    <div className={cn(
      "w-full py-2 px-4 flex items-center justify-center gap-3 transition-colors",
      isExpired ? "bg-red-500/90" : "bg-amber-500/90"
    )}>
      {isExpired ? (
        <AlertTriangle className="h-4 w-4 text-white" />
      ) : (
        <Clock className="h-4 w-4 text-white" />
      )}
      <p className="text-sm font-bold text-white">
        {isExpired 
          ? "Your subscription has expired! Features are locked." 
          : `Subscription expiring in ${daysLeft} days. Renew soon to avoid interruption.`}
      </p>
      <button 
        onClick={() => setCurrentPage('subscription')}
        className="flex items-center gap-1 text-xs font-black uppercase tracking-widest bg-black/20 hover:bg-black/30 text-white px-3 py-1 rounded-full transition-colors"
      >
        Renew Now
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  )
}
