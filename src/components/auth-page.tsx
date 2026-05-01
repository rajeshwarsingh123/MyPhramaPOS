'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  Cross,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   PASSWORD STRENGTH CHECKER
   ═══════════════════════════════════════════════ */

type PasswordStrength = 'weak' | 'medium' | 'strong'

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return 'weak'
  if (score <= 2) return 'medium'
  return 'strong'
}

function StrengthBar({ password }: { password: string }) {
  if (!password) return null
  const strength = getPasswordStrength(password)
  const config = {
    weak: { width: '33%', color: 'bg-red-500', label: 'Weak', textColor: 'text-red-400' },
    medium: { width: '66%', color: 'bg-amber-500', label: 'Medium', textColor: 'text-amber-400' },
    strong: { width: '100%', color: 'bg-emerald-500', label: 'Strong', textColor: 'text-emerald-400' },
  }
  const c = config[strength]

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: c.width }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`h-full rounded-full ${c.color}`}
        />
      </div>
      <p className={`text-[11px] font-medium ${c.textColor}`}>{c.label}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   AUTH INPUT COMPONENT
   ═══════════════════════════════════════════════ */

function AuthInput({
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  rightElement,
}: {
  icon: React.ElementType
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  rightElement?: React.ReactNode
}) {
  return (
    <div className="relative group">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary/60 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all duration-200"
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   LOGIN FORM
   ═══════════════════════════════════════════════ */

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const setShowAuth = useAppStore((s) => s.setShowAuth)
  const setLaunchedApp = useAppStore((s) => s.setLaunchedApp)
  const setAdminPage = useAppStore((s) => s.setAdminPage)
  const setAdminAuth = useAppStore((s) => s.setAdminAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      setShowAuth(false)

      if (data.userType === 'admin') {
        // Super admin / staff — route to admin panel
        setAdminAuth({
          isAuthenticated: true,
          adminId: data.id,
          adminName: data.name,
          adminEmail: data.email,
          adminRole: data.role,
          loginTime: data.lastLogin,
        })
        setAdminPage('admin-dashboard')
      } else {
        // Regular tenant — route to pharmacy app
        setLaunchedApp(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <h2 className="text-2xl font-bold text-landing-foreground mb-1">Welcome back</h2>
      <p className="text-sm text-landing-muted mb-7">Sign in to your PharmPOS account</p>

      <div className="space-y-4">
        <AuthInput icon={Mail} type="email" placeholder="Email address" value={email} onChange={setEmail} />

        <AuthInput icon={Lock}
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={password}
          onChange={setPassword}
          onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              onClick={() => setRemember(!remember)}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${
                remember
                  ? 'bg-primary border-primary'
                  : 'border-white/20 group-hover:border-white/40'
              }`}
            >
              {remember && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="text-xs text-landing-muted">Remember me</span>
          </label>
          <button type="button" className="text-xs text-primary/80 hover:text-primary transition-colors font-medium">
            Forgot password?
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center"
          >
            {error}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              Signing in...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Sign In
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </motion.button>
      </div>

      <p className="text-center text-sm text-landing-muted mt-7">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          Sign up
        </button>
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   SIGNUP FORM
   ═══════════════════════════════════════════════ */

function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const setShowAuth = useAppStore((s) => s.setShowAuth)
  const setLaunchedApp = useAppStore((s) => s.setLaunchedApp)
  const [fullName, setFullName] = useState('')
  const [pharmacyName, setPharmacyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword
  const passwordStrength = getPasswordStrength(password)

  const handleSignup = async () => {
    if (!fullName || !pharmacyName || !email || !phone || !password || !confirmPassword || !agreed) return
    if (password !== confirmPassword) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    setShowAuth(false)
    setLaunchedApp(true)
  }

  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <h2 className="text-2xl font-bold text-landing-foreground mb-1">Create your account</h2>
      <p className="text-sm text-landing-muted mb-7">Get started with PharmPOS for free</p>

      <div className="space-y-3.5 max-h-[52vh] overflow-y-auto pr-1 scroll-container">
        <AuthInput icon={User} type="text" placeholder="Full Name" value={fullName} onChange={setFullName} />
        <AuthInput icon={Building2} type="text" placeholder="Pharmacy Name" value={pharmacyName} onChange={setPharmacyName} />
        <AuthInput icon={Mail} type="email" placeholder="Email address" value={email} onChange={setEmail} />
        <AuthInput icon={Phone} type="tel" placeholder="Phone Number" value={phone} onChange={setPhone} />

        <div>
          <AuthInput
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={setPassword}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <StrengthBar password={password} />
        </div>

        <div>
          <AuthInput
            icon={Lock}
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          {!passwordsMatch && confirmPassword.length > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 mt-1"
            >
              Passwords do not match
            </motion.p>
          )}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer group py-1">
          <div
            onClick={() => setAgreed(!agreed)}
            className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 transition-all duration-200 shrink-0 ${
              agreed
                ? 'bg-primary border-primary'
                : 'border-white/20 group-hover:border-white/40'
            }`}
          >
            {agreed && <Check className="w-2.5 h-2.5 text-white" />}
          </div>
          <span className="text-xs text-landing-muted leading-relaxed">
            I agree to the{' '}
            <button type="button" className="text-primary/80 hover:text-primary transition-colors font-medium">
              Terms &amp; Conditions
            </button>{' '}
            and{' '}
            <button type="button" className="text-primary/80 hover:text-primary transition-colors font-medium">
              Privacy Policy
            </button>
          </span>
        </label>

        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSignup}
          disabled={loading || !agreed || !passwordsMatch}
          className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              Creating account...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Create Account
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </motion.button>
      </div>

      <p className="text-center text-sm text-landing-muted mt-5">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          Log in
        </button>
      </p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   BRAND SHOWCASE (LEFT PANEL)
   ═══════════════════════════════════════════════ */

function BrandShowcase() {
  const highlights = [
    { icon: ShieldCheck, text: 'Bank-level data encryption' },
    { icon: Sparkles, text: 'AI-powered insights & analytics' },
    { icon: Check, text: 'GST-compliant billing & reports' },
  ]

  return (
    <div className="hidden lg:flex flex-col justify-between h-full p-10 xl:p-12 relative overflow-hidden">
      {/* Gradient orb */}
      <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] bg-emerald-500/15 rounded-full blur-[80px] animate-pulse-slow" />

      <div className="relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/30">
            <Cross className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-landing-foreground">PharmPOS</span>
            <p className="text-[11px] text-landing-muted">Smart Pharmacy Management</p>
          </div>
        </div>

        <h2 className="text-3xl xl:text-4xl font-extrabold text-landing-foreground leading-tight mb-4">
          Manage your pharmacy{' '}
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-300 bg-clip-text text-transparent">
            smarter
          </span>
        </h2>
        <p className="text-sm text-landing-muted leading-relaxed max-w-sm">
          Join 1,000+ pharmacies using PharmPOS to streamline billing, inventory, and compliance — all from one dashboard.
        </p>
      </div>

      <div className="relative z-10 space-y-4">
        {highlights.map((item, i) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <item.icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm text-landing-muted">{item.text}</span>
          </motion.div>
        ))}

        {/* Trust badges */}
        <div className="flex items-center gap-4 pt-6 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-landing-muted">SOC 2 Certified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-landing-muted">99.9% Uptime</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN AUTH PAGE OVERLAY
   ═══════════════════════════════════════════════ */

export function AuthPage() {
  const setShowAuth = useAppStore((s) => s.setShowAuth)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] bg-landing-bg/95 backdrop-blur-xl overflow-y-auto"
    >
      {/* Floating background blobs */}
      <div className="fixed top-1/4 left-1/6 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/6 w-[350px] h-[350px] bg-emerald-500/8 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" />
      <div className="fixed top-1/2 right-1/3 w-[250px] h-[250px] bg-teal-400/6 rounded-full blur-[80px] animate-pulse-slow pointer-events-none" />

      {/* Close button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAuth(false)}
        className="fixed top-5 right-5 z-[101] w-10 h-10 rounded-full glass-landing-card flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
      >
        <X className="w-5 h-5" />
      </motion.button>

      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-4xl glass-landing-card rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border border-white/[0.08]"
        >
          {/* Gradient accent top border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-emerald-400 to-teal-300" />

          <div className="grid lg:grid-cols-2 min-h-[580px]">
            {/* Left panel — brand showcase */}
            <div className="hidden lg:block bg-gradient-to-br from-white/[0.02] to-white/[0.01] border-r border-white/5">
              <BrandShowcase />
            </div>

            {/* Right panel — form */}
            <div className="p-7 sm:p-10">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2.5 mb-8">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
                  <Cross className="w-5 h-5 text-white" />
                </div>
                <span className="text-base font-bold text-landing-foreground">PharmPOS</span>
              </div>

              {/* Mode toggle tabs */}
              <div className="flex mb-8 rounded-xl bg-white/5 p-1 border border-white/5">
                {(['login', 'signup'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMode(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      mode === tab
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {tab === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {/* Forms with AnimatePresence */}
              <AnimatePresence mode="wait">
                {mode === 'login' ? (
                  <LoginForm onSwitch={() => setMode('signup')} />
                ) : (
                  <SignupForm onSwitch={() => setMode('login')} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
