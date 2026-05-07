'use client'

import { motion } from 'framer-motion'
import { Lock, CreditCard, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

export function SubscriptionLock() {
  const { setCurrentPage } = useAppStore()

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] bg-landing-bg/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full bg-[oklch(0.18_0.02_250)] border border-red-500/30 rounded-3xl p-8 shadow-2xl shadow-black/50 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-10 w-10 text-red-400" />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-3">Access Locked</h2>
        <p className="text-white/60 mb-8 leading-relaxed">
          Your yearly PharmacyPOS subscription has expired. Please renew your subscription to continue using billing, inventory, and reports.
        </p>

        <div className="space-y-3">
          <Button 
            onClick={() => setCurrentPage('subscription')}
            className="w-full h-14 bg-gradient-to-r from-primary to-emerald-500 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2"
          >
            Renew Subscription
            <CreditCard className="h-5 w-5" />
          </Button>
          
          <button 
            onClick={() => setCurrentPage('subscription')}
            className="text-white/40 hover:text-white/60 text-sm font-medium flex items-center gap-2 mx-auto transition-colors"
          >
            View Subscription Details
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
