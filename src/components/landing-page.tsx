'use client'

import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect, type ReactNode } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Receipt,
  Package,
  BarChart3,
  Bell,
  Sparkles,
  ScanLine,
  Smartphone,
  GraduationCap,
  Clock,
  ShieldCheck,
  ArrowRight,
  Play,
  Star,
  Check,
  Zap,
  ChevronRight,
  Cross,
  Pill,
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ═══════════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

function Section({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.section
      id={id}
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.section>
  )
}

function AnimatedCounter({ end, suffix = '', prefix = '', duration = 2 }: { end: number; suffix?: string; prefix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = end / (duration * 60)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [inView, end, duration])

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

/* ═══════════════════════════════════════════════
   3D FLOATING DASHBOARD MOCKUP
   ═══════════════════════════════════════════════ */

function FloatingDashboard() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [60, -60])
  const rotateX = useTransform(scrollYProgress, [0, 1], [8, -4])
  const rotateY = useTransform(scrollYProgress, [0, 0.5], [2, -2])

  return (
    <motion.div ref={ref} style={{ y, rotateX, rotateY }} className="relative">
      {/* Glow behind dashboard */}
      <div className="absolute -inset-10 bg-gradient-to-br from-primary/20 via-emerald-500/15 to-teal-400/10 rounded-full blur-3xl opacity-60" />

      {/* Main dashboard card */}
      <div className="relative glass-landing-card rounded-2xl p-5 w-full max-w-[520px] mx-auto shadow-2xl shadow-black/20">
        {/* Dashboard top bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 h-6 rounded-md bg-white/10 backdrop-blur-sm" />
        </div>

        {/* Dashboard grid */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="glass-landing-card rounded-xl p-3"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-[10px] text-white/50">Today Sales</p>
            <p className="text-sm font-bold text-white">₹24,580</p>
          </motion.div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="glass-landing-card rounded-xl p-3"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
              <Pill className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-[10px] text-white/50">Medicines</p>
            <p className="text-sm font-bold text-white">1,247</p>
          </motion.div>

          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="glass-landing-card rounded-xl p-3"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-[10px] text-white/50">Expiring</p>
            <p className="text-sm font-bold text-white">12</p>
          </motion.div>
        </div>

        {/* Chart area */}
        <div className="glass-landing-card rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-white/60">Weekly Revenue</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">+12.5%</span>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-16">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-md bg-gradient-to-t from-primary/60 to-emerald-400/80"
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating mini card — top right */}
      <motion.div
        animate={{ y: [0, -10, 0], x: [0, 4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-6 -right-4 sm:-right-8 glass-landing-card rounded-xl p-3 shadow-xl shadow-black/20"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-white/50">Bill #1247</p>
            <p className="text-xs font-bold text-white">Completed ✓</p>
          </div>
        </div>
      </motion.div>

      {/* Floating mini card — bottom left */}
      <motion.div
        animate={{ y: [0, -8, 0], x: [0, -4, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        className="absolute -bottom-4 -left-4 sm:-left-10 glass-landing-card rounded-xl p-3 shadow-xl shadow-black/20"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-[10px] text-white/50">Expiry Alert</p>
            <p className="text-xs font-bold text-white">3 batches due</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════ */

function HeroSection() {
  const setShowAuth = useAppStore((s) => s.setShowAuth)

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20 pb-16 lg:pt-24">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/15 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] animate-pulse-slow" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-landing-card text-xs font-medium text-white/80 mb-6"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              AI-Powered Pharmacy Management
              <ChevronRight className="w-3 h-3 text-white/40" />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6">
              <span className="text-landing-foreground">Simple Pharmacy Billing,</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Powerful Results
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-landing-muted max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Manage stock, billing, expiry &amp; reports — all in one simple system. Built for Indian pharmacies with GST support.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAuth(true)}
                className="group relative px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-emerald-500 to-teal-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold glass-landing-card text-white/90 hover:text-white transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                </div>
                Watch Demo
              </motion.button>
            </div>

            {/* Trust line */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 flex items-center gap-3 justify-center lg:justify-start text-sm text-white/40"
            >
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-emerald-400/60 border-2 border-landing-bg flex items-center justify-center text-[9px] font-bold text-white">
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span>Trusted by <strong className="text-white/60">1,000+</strong> pharmacies</span>
            </motion.div>
          </motion.div>

          {/* 3D Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative perspective-[1200px]"
          >
            <FloatingDashboard />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   FEATURES SECTION
   ═══════════════════════════════════════════════ */

const features = [
  { icon: Receipt, title: 'Smart Billing', desc: 'Fast FIFO billing with GST auto-calculation, discount management & instant invoice generation.', color: 'from-emerald-500 to-teal-400' },
  { icon: Clock, title: 'Batch & Expiry Tracking', desc: '5-level colour-coded expiry alerts. Never sell expired medicines again.', color: 'from-amber-500 to-orange-400' },
  { icon: Package, title: 'Stock Management', desc: 'Real-time stock levels, purchase entries, supplier management & low-stock alerts.', color: 'from-blue-500 to-cyan-400' },
  { icon: BarChart3, title: 'GST Reports', desc: 'Auto-generated GST reports, profit analysis, sales trends & daily summaries.', color: 'from-purple-500 to-pink-400' },
  { icon: ScanLine, title: 'AI Bill Scan', desc: 'Scan any pharmacy bill with AI — instantly extract medicines, prices & batch details.', color: 'from-rose-500 to-red-400' },
  { icon: Bell, title: 'Smart Alerts', desc: 'Intelligent notifications for expiry, low stock, sales targets & business insights.', color: 'from-teal-500 to-emerald-400' },
]

function FeaturesSection() {
  return (
    <Section className="py-24 lg:py-32 relative" id="features">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[150px]" />
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-landing-card text-xs font-medium text-white/70 mb-4">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Powerful Features
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-landing-foreground mb-4">
            Everything Your Pharmacy Needs
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-landing-muted max-w-2xl mx-auto">
            From billing to inventory, expiry tracking to AI-powered insights — all in one beautiful system.
          </motion.p>
        </div>

        {/* Feature Cards */}
        <motion.div variants={staggerContainer} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="group relative glass-landing-card rounded-2xl p-6 cursor-default overflow-hidden"
            >
              {/* Hover glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-landing-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-landing-muted leading-relaxed">{f.desc}</p>

              {/* Bottom accent */}
              <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${f.color} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════
   PRODUCT DEMO SECTION
   ═══════════════════════════════════════════════ */

function ProductDemoSection() {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = [
    { label: 'Billing', icon: Receipt },
    { label: 'Dashboard', icon: BarChart3 },
    { label: 'Inventory', icon: Package },
  ]

  return (
    <Section className="py-24 lg:py-32 relative overflow-hidden" id="demo">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — Text + Tabs */}
          <div>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-landing-card text-xs font-medium text-white/70 mb-4">
              <Play className="w-3.5 h-3.5 text-primary" />
              Live Preview
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-landing-foreground mb-4">
              See It in Action
            </motion.h2>
            <motion.p variants={fadeUp} className="text-landing-muted mb-8 leading-relaxed">
              A clean, intuitive interface designed for pharmacists. No training needed — just open and start billing.
            </motion.p>

            {/* Tab Buttons */}
            <motion.div variants={staggerContainer} className="flex flex-wrap gap-3">
              {tabs.map((tab, i) => (
                <motion.button
                  key={tab.label}
                  variants={fadeUp}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeTab === i
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'glass-landing-card text-white/70 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              ))}
            </motion.div>

            {/* Feature list */}
            <motion.div variants={staggerContainer} className="mt-8 space-y-3">
              {[
                'One-click bill generation with GST',
                'Real-time stock level tracking',
                'Colour-coded expiry management',
              ].map((text, i) => (
                <motion.div key={i} variants={fadeUp} className="flex items-center gap-3 text-sm text-white/70">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  {text}
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right — 3D Tilted Screen */}
          <motion.div
            variants={scaleIn}
            className="relative perspective-[1000px]"
          >
            <motion.div
              animate={{ rotateY: [0, 2, 0, -2, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10"
            >
              {/* Screen content based on active tab */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="glass-landing-card p-6 aspect-[4/3]"
                >
                  {activeTab === 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">New Bill</h4>
                        <div className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] text-emerald-400 font-medium">Active</div>
                      </div>
                      <div className="space-y-2">
                        {[['Paracetamol 500mg', '₹25.00', '2'], ['Amoxicillin 250mg', '₹85.50', '1'], ['Cetirizine 10mg', '₹15.00', '3']].map(([name, price, qty]) => (
                          <div key={name} className="flex items-center justify-between glass-landing-card rounded-lg p-2.5">
                            <div>
                              <p className="text-xs font-medium text-white">{name}</p>
                              <p className="text-[10px] text-white/40">Qty: {qty}</p>
                            </div>
                            <p className="text-xs font-bold text-white">{price}</p>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                        <span className="text-xs text-white/50">Total (incl. GST)</span>
                        <span className="text-lg font-bold text-emerald-400">₹180.75</span>
                      </div>
                    </div>
                  )}
                  {activeTab === 1 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-white">Dashboard Overview</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ l: 'Today Sales', v: '₹24,580', c: 'text-emerald-400' }, { l: 'Bills', v: '47', c: 'text-blue-400' }, { l: 'Medicines', v: '1,247', c: 'text-purple-400' }, { l: 'Expiring', v: '12', c: 'text-amber-400' }].map((s) => (
                          <div key={s.l} className="glass-landing-card rounded-lg p-3">
                            <p className="text-[10px] text-white/40">{s.l}</p>
                            <p className={`text-lg font-bold ${s.c}`}>{s.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeTab === 2 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-white">Stock Levels</h4>
                      <div className="space-y-2">
                        {[{ n: 'Paracetamol 500mg', s: 145, t: 200 }, { n: 'Amoxicillin 250mg', s: 23, t: 100 }, { n: 'Vitamin D3', s: 8, t: 50 }].map((m) => (
                          <div key={m.n} className="glass-landing-card rounded-lg p-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-medium text-white">{m.n}</p>
                              <span className={`text-[10px] font-medium ${m.s < m.t * 0.2 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {m.s} units
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10">
                              <div className={`h-full rounded-full transition-all duration-700 ${m.s < m.t * 0.2 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${(m.s / m.t) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Floating labels */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-3 right-8 glass-landing-card rounded-lg px-3 py-1.5 text-[10px] font-medium text-emerald-400 shadow-lg"
            >
              ✨ GST Auto-Calculated
            </motion.div>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
              className="absolute -bottom-3 left-8 glass-landing-card rounded-lg px-3 py-1.5 text-[10px] font-medium text-blue-400 shadow-lg"
            >
              📦 FIFO Batch Selection
            </motion.div>
          </motion.div>
        </div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════
   USP SECTION
   ═══════════════════════════════════════════════ */

const usps = [
  { icon: GraduationCap, title: 'No Training Needed', desc: 'Intuitive interface — your staff will love it from day one.' },
  { icon: Smartphone, title: 'Works on Mobile', desc: 'Fully responsive design. Bill from any device, anywhere.' },
  { icon: Clock, title: 'Auto Expiry Tracking', desc: '5-level colour codes from safe to expired — never miss a batch.' },
  { icon: Sparkles, title: 'AI Powered System', desc: 'Smart bill scanning, insights & predictions powered by AI.' },
  { icon: ShieldCheck, title: 'GST Compliant', desc: 'Built for Indian pharmacies with full GST report support.' },
  { icon: Zap, title: 'Lightning Fast', desc: 'Generate bills in under 5 seconds. No lag, no waiting.' },
]

function USPSection() {
  return (
    <Section className="py-24 lg:py-32 relative" id="usps">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-landing-foreground mb-4">
            Why PharmPOS?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-landing-muted max-w-xl mx-auto">
            Built specifically for Indian pharmacies with every feature you need.
          </motion.p>
        </div>

        <motion.div variants={staggerContainer} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {usps.map((u) => (
            <motion.div
              key={u.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="group text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/10">
                <u.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-bold text-landing-foreground mb-1.5">{u.title}</h3>
              <p className="text-sm text-landing-muted leading-relaxed">{u.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════
   STATS SECTION
   ═══════════════════════════════════════════════ */

const stats = [
  { value: 1000, suffix: '+', label: 'Pharmacies', desc: 'Active shops using PharmPOS daily' },
  { value: 10000, suffix: '+', label: 'Bills Generated', desc: 'Invoices created every month' },
  { value: 99, suffix: '%', label: 'Simpler', desc: 'Than traditional pharmacy software' },
  { value: 4.9, suffix: '/5', label: 'User Rating', desc: 'Average satisfaction score' },
]

function StatsSection() {
  return (
    <Section className="py-24 lg:py-32 relative" id="stats">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <motion.div variants={staggerContainer} className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center">
              <div className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-primary via-emerald-400 to-teal-300 bg-clip-text text-transparent mb-2">
                <AnimatedCounter end={s.value} suffix={s.suffix} />
              </div>
              <p className="text-sm font-semibold text-landing-foreground mb-0.5">{s.label}</p>
              <p className="text-xs text-landing-muted">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════
   TESTIMONIAL SECTION
   ═══════════════════════════════════════════════ */

const testimonials = [
  { name: 'Rajesh Kumar', role: 'Kumar Medical Store, Mumbai', text: 'PharmPOS transformed how we manage our pharmacy. Billing is now 3x faster, and we never miss an expiry date. The AI bill scanning feature is a game changer!', rating: 5 },
  { name: 'Priya Sharma', role: 'Sharma Pharmacy, Delhi', text: 'We switched from manual ledgers to PharmPOS. The GST reports saved us hours during tax filing. Absolutely worth every rupee.', rating: 5 },
  { name: 'Mohammed Ali', role: 'Ali Healthcare, Hyderabad', text: 'The best pharmacy software I\'ve used. Simple, fast, and the support team is amazing. My staff learned it in just 10 minutes.', rating: 5 },
]

function TestimonialSection() {
  return (
    <Section className="py-24 lg:py-32 relative" id="testimonials">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-landing-foreground mb-4">
            Loved by Pharmacists
          </motion.h2>
          <motion.p variants={fadeUp} className="text-landing-muted max-w-xl mx-auto">
            Hear from pharmacy owners who switched to PharmPOS.
          </motion.p>
        </div>

        <motion.div variants={staggerContainer} className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -6, rotateY: 2, rotateX: -1 }}
              className="glass-landing-card rounded-2xl p-6 perspective-[800px]"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-landing-muted leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-emerald-400/60 flex items-center justify-center text-sm font-bold text-white">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-landing-foreground">{t.name}</p>
                  <p className="text-xs text-landing-muted">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════
   PRICING SECTION
   ═══════════════════════════════════════════════ */

const plans = [
  {
    name: 'Free',
    price: '0',
    desc: 'Perfect for small pharmacies getting started',
    features: ['Up to 500 medicines', 'Basic billing', 'Stock tracking', 'Expiry alerts', 'Single device'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '499',
    period: '/month',
    desc: 'For growing pharmacies that need more power',
    features: ['Unlimited medicines', 'AI Bill Scanning', 'GST Reports', 'Multi-device', 'Priority support', 'Data backup', 'Customer management'],
    cta: 'Start Pro Trial',
    popular: true,
  },
]

function PricingSection() {
  const setShowAuth = useAppStore((s) => s.setShowAuth)

  return (
    <Section className="py-24 lg:py-32 relative" id="pricing">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px]" />
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="text-center mb-16">
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-landing-foreground mb-4">
            Simple Pricing
          </motion.h2>
          <motion.p variants={fadeUp} className="text-landing-muted max-w-xl mx-auto">
            Start free, upgrade when you&apos;re ready. No hidden fees.
          </motion.p>
        </div>

        <motion.div variants={staggerContainer} className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className={`relative rounded-2xl p-8 ${plan.popular ? 'glass-landing-card-primary' : 'glass-landing-card'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-emerald-400 text-xs font-bold text-white shadow-lg shadow-primary/30">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold text-landing-foreground mb-1">{plan.name}</h3>
              <p className="text-sm text-landing-muted mb-6">{plan.desc}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-landing-foreground">₹{plan.price}</span>
                {plan.period && <span className="text-sm text-landing-muted">{plan.period}</span>}
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAuth(true)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-primary to-emerald-400 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
                    : 'glass-landing-card text-white/90 hover:text-white'
                }`}
              >
                {plan.cta}
              </motion.button>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-landing-muted">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════
   FINAL CTA SECTION
   ═══════════════════════════════════════════════ */

function FinalCTA() {
  const setShowAuth = useAppStore((s) => s.setShowAuth)

  return (
    <Section className="py-24 lg:py-32 relative" id="cta">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <motion.div
          variants={scaleIn}
          className="relative rounded-3xl overflow-hidden p-12 sm:p-16 text-center"
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-emerald-500/10 to-teal-400/15" />
          <div className="absolute inset-0 glass-landing-card" />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/20 rounded-full blur-[80px]" />

          <div className="relative">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-landing-foreground mb-4 leading-tight">
              Start Managing Your Pharmacy<br />
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Smarter Today
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-landing-muted max-w-xl mx-auto mb-8 text-lg">
              Join 1,000+ pharmacies already using PharmPOS. Free to start, no credit card required.
            </motion.p>
            <motion.div variants={fadeUp}>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAuth(true)}
                className="group relative px-10 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-shadow duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

/* ═══════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════ */

function LandingFooter() {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center ring-1 ring-primary/20">
              <Cross className="w-4 h-4 text-primary" />
            </div>
            <span className="text-base font-bold text-landing-foreground">PharmPOS</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-landing-muted">
            <a href="#features" className="hover:text-landing-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-landing-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-landing-foreground transition-colors">Reviews</a>
          </div>
          <p className="text-xs text-landing-muted/60">© 2026 PharmPOS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════ */

function LandingNav() {
  const setShowAuth = useAppStore((s) => s.setShowAuth)
  const [scrolled, setScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close menu when clicking on a link
  const handleNavLinkClick = () => setIsMobileMenuOpen(false)

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-[background,backdrop-filter,box-shadow] duration-300 ${
          scrolled || isMobileMenuOpen
            ? 'glass-landing-nav shadow-lg shadow-black/10'
            : 'bg-transparent'
        }`}
        style={{ borderWidth: 0, borderStyle: 'none' }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2.5 relative z-50">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center ring-1 ring-primary/20 shadow-lg shadow-primary/10">
                <Cross className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-lg font-bold text-landing-foreground tracking-tight">PharmPOS</span>
                <span className="hidden lg:inline text-[10px] text-landing-muted ml-2 font-medium uppercase tracking-widest">SaaS Edition</span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-10 text-sm text-landing-muted">
              {['Features', 'Demo', 'Pricing', 'Reviews'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="hover:text-landing-foreground transition-all duration-300 font-medium relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </div>

            {/* Desktop Actions / Mobile Toggle */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAuth(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold glass-landing-card text-white/80 hover:text-white transition-all duration-300"
                >
                  Log In
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAuth(true)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-primary to-emerald-400 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300"
                >
                  Get Started
                </motion.button>
              </div>

              {/* Mobile Menu Toggle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden relative z-50 w-10 h-10 flex items-center justify-center rounded-xl glass-landing-card text-white"
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="w-6 h-6" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="w-6 h-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '100vh' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 md:hidden bg-landing-bg/95 backdrop-blur-2xl overflow-hidden flex flex-col"
          >
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 pt-20">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="flex flex-col items-center gap-6"
              >
                {['Features', 'Demo', 'Pricing', 'Reviews'].map((item, i) => (
                  <motion.a
                    key={item}
                    variants={fadeUp}
                    href={`#${item.toLowerCase()}`}
                    onClick={handleNavLinkClick}
                    className="text-2xl font-bold text-landing-foreground hover:text-primary transition-colors"
                  >
                    {item}
                  </motion.a>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col w-full gap-4 max-w-xs mt-8"
              >
                <Button
                  onClick={() => {
                    handleNavLinkClick()
                    setShowAuth(true)
                  }}
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-emerald-400 text-white shadow-xl shadow-primary/20"
                >
                  Get Started Free
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleNavLinkClick()
                    setShowAuth(true)
                  }}
                  className="w-full h-14 rounded-2xl text-lg font-bold glass-landing-card text-white/90"
                >
                  Log In
                </Button>
              </motion.div>
            </div>

            {/* Mobile Footer */}
            <div className="p-8 border-t border-white/5 text-center">
              <p className="text-sm text-landing-muted">Trusted by 1,000+ pharmacies across India</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ═══════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════ */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-landing-bg text-landing-foreground overflow-x-hidden">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <ProductDemoSection />
      <USPSection />
      <StatsSection />
      <TestimonialSection />
      <PricingSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  )
}
