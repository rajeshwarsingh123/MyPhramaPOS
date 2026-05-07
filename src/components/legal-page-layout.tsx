'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Cross } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode } from 'react'

export function LegalPageLayout({ children, title, lastUpdated }: { children: ReactNode, title: string, lastUpdated: string }) {
  return (
    <div className="min-h-screen bg-[#020817] text-slate-200 selection:bg-primary/30 selection:text-white">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020817]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between max-w-5xl">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center ring-1 ring-primary/20 shadow-lg shadow-primary/10 group-hover:scale-105 transition-transform">
              <Cross className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">PharmPOS</span>
          </Link>
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative pt-20 pb-16 border-b border-white/5">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
              {title}
            </h1>
            <p className="text-slate-400 text-sm">
              Last Updated: {lastUpdated}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-20 max-w-3xl">
        <motion.article 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="prose prose-invert prose-slate max-w-none 
            prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
            prose-p:text-slate-400 prose-p:leading-relaxed prose-p:mb-6
            prose-li:text-slate-400 prose-strong:text-white prose-strong:font-semibold
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-2 prose-h2:border-b prose-h2:border-white/10
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4"
        >
          {children}
        </motion.article>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-white/5 py-12 mt-20">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <p className="text-slate-500 text-sm mb-4">
            © 2026 PharmPOS. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link>
            <Link href="/refund" className="hover:text-primary transition-colors">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
