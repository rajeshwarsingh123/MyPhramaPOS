'use client'

import { useState, useRef, useEffect } from 'react'
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
  ArrowLeft,
  Cross,
  Check,
  ShieldCheck,
  Sparkles,
  MailCheck,
  CheckCircle2,
  KeyRound,
  AlertCircle,
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
  disabled = false,
}: {
  icon: React.ElementType
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  rightElement?: React.ReactNode
  disabled?: boolean
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
        disabled={disabled}
        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   LOADING SPINNER
   ═══════════════════════════════════════════════ */

function Spinner({ className = '' }: { className?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`w-4 h-4 border-2 border-white/30 border-t-white rounded-full ${className}`}
    />
  )
}

/* ═══════════════════════════════════════════════
   LOGIN FORM
   ═══════════════════════════════════════════════ */

function LoginForm({ onSwitch, onForgotPassword }: { onSwitch: () => void; onForgotPassword: () => void }) {
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
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-primary/80 hover:text-primary transition-colors font-medium"
          >
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
              <Spinner />
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
   FORGOT PASSWORD FORM (OTP-based 3-step flow)
   ═══════════════════════════════════════════════ */

type ForgotStep = 'enter-email' | 'verify-otp' | 'enter-password' | 'success'

function OtpInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return
    const newValue = value.split('')
    newValue[index] = char
    const joined = newValue.join('').slice(0, 6)
    onChange(joined)
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      const newValue = value.split('')
      if (!newValue[index] && index > 0) {
        newValue[index - 1] = ''
        onChange(newValue.join('').slice(0, 6))
        inputRefs.current[index - 1]?.focus()
      } else {
        newValue[index] = ''
        onChange(newValue.join('').slice(0, 6))
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    if (pasted.length > 0) {
      const focusIndex = Math.min(pasted.length, 5)
      inputRefs.current[focusIndex]?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-11 h-13 rounded-xl text-center text-lg font-bold bg-white/5 border-2 text-landing-foreground placeholder:text-white/15 focus:outline-none focus:ring-2 transition-all duration-200 ${
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
              : value[i]
                ? 'border-primary/50 focus:border-primary focus:ring-primary/20'
                : 'border-white/10 focus:border-primary/50 focus:ring-primary/10'
          }`}
        />
      ))}
    </div>
  )
}

function CountdownTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return }
    const timer = setInterval(() => setRemaining((r) => r - 1), 1000)
    return () => clearInterval(timer)
  }, [remaining, onExpire])

  const minutes = Math.floor(remaining / 60)
  const secs = remaining % 60
  return (
    <span className="text-xs font-mono text-landing-muted">
      {minutes}:{secs.toString().padStart(2, '0')}
    </span>
  )
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<ForgotStep>('enter-email')
  const [email, setEmail] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpExpired, setOtpExpired] = useState(false)

  const passwordsMatch = confirmPassword.length === 0 || newPassword === confirmPassword
  const [resendCooldown, setResendCooldown] = useState(0)

  const handleBack = () => {
    if (step === 'enter-email') {
      onBack()
    } else if (step === 'verify-otp') {
      setStep('enter-email')
      setOtp('')
      setOtpError('')
      setOtpSent(false)
      setOtpExpired(false)
      setError('')
    } else if (step === 'enter-password') {
      setStep('verify-otp')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
    }
  }

  // Step 1: Verify email & send OTP
  const handleVerifyEmail = async () => {
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Account not found')
        setLoading(false)
        return
      }

      setMaskedEmail(data.maskedEmail || email)
      setUserName(data.name || '')
      setIsAdmin(data.isAdmin || false)
      setOtpSent(true)
      setOtpExpired(false)
      setOtp('')
      setOtpError('')
      setResendCooldown(60)
      setStep('verify-otp')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter the complete 6-digit code')
      return
    }
    setOtpError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp }),
      })
      const data = await res.json()

      if (!res.ok) {
        setOtpError(data.error || 'Invalid code')
        setLoading(false)
        return
      }

      setStep('enter-password')
    } catch {
      setOtpError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset password
  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('Please enter a new password')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Password reset failed')
        setLoading(false)
        return
      }

      setStep('success')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Back to login from success
  const handleBackToLogin = () => {
    setStep('enter-email')
    setEmail('')
    setNewPassword('')
    setConfirmPassword('')
    setOtp('')
    setMaskedEmail('')
    setUserName('')
    setIsAdmin(false)
    setError('')
    setOtpSent(false)
    onBack()
  }

  return (
    <motion.div
      key="forgot-password"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-1.5 text-xs text-landing-muted hover:text-landing-foreground transition-colors mb-4 group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        {step === 'enter-email' ? 'Back to login' : step === 'verify-otp' ? 'Change email' : 'Back to verify'}
      </button>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Enter Email ── */}
        {step === 'enter-email' && (
          <motion.div
            key="step-email"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-landing-foreground">Forgot Password?</h2>
                <p className="text-sm text-landing-muted">No worries, we&apos;ll help you reset it</p>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div>
                <AuthInput
                  icon={Mail}
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={setEmail}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyEmail() }}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center flex items-center justify-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleVerifyEmail}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Sending code...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Send Reset Code
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </motion.button>

              <p className="text-[11px] text-landing-muted/60 text-center leading-relaxed">
                We&apos;ll send a 6-digit verification code to your email address.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Verify OTP ── */}
        {step === 'verify-otp' && (
          <motion.div
            key="step-otp"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <MailCheck className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-landing-foreground">Check Your Email</h2>
                <p className="text-sm text-landing-muted">
                  We sent a code to <span className="text-landing-foreground font-medium">{maskedEmail}</span>
                </p>
              </div>
            </div>

            {/* Simulated email preview */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="mt-5 rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400/60" />
                <div className="w-2 h-2 rounded-full bg-amber-400/60" />
                <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <span className="ml-2 text-[10px] text-landing-muted/50 font-mono">mail.pharmpos.com</span>
              </div>
              <div className="p-4">
                <p className="text-[11px] text-landing-muted/40 mb-1">From: PharmPOS Security &lt;noreply@pharmpos.com&gt;</p>
                <p className="text-[11px] text-landing-muted/40 mb-2">To: {maskedEmail}</p>
                <p className="text-sm text-landing-foreground font-medium">Password Reset Verification</p>
                <p className="text-xs text-landing-muted mt-1.5 leading-relaxed">
                  Your 6-digit verification code is:
                </p>
                <div className="mt-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-center">
                  <span className="text-xl font-bold font-mono tracking-[0.3em] text-primary">
                    {/* OTP digits shown here — in production, this would only be sent to the email */}
                    {email.includes('@') ? '••••••' : '------'}
                  </span>
                </div>
                <p className="text-[10px] text-landing-muted/40 mt-2 leading-relaxed">
                  If you didn&apos;t request this code, you can safely ignore this email.
                </p>
              </div>
            </motion.div>

            <div className="space-y-4 mt-5">
              {/* OTP Input */}
              <div>
                <p className="text-xs text-landing-muted mb-3 text-center font-medium">Enter verification code</p>
                <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpError('') }} error={!!otpError} />
              </div>

              {otpError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center flex items-center justify-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {otpError}
                </motion.div>
              )}

              {/* Verify button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Verify Code
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </motion.button>

              {/* Resend / Timer */}
              <div className="flex items-center justify-center gap-2 text-xs">
                {resendCooldown > 0 ? (
                  <span className="text-landing-muted/60">
                    Resend code in <CountdownTimer seconds={resendCooldown} onExpire={() => setResendCooldown(0)} />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={loading}
                    className="text-primary/80 hover:text-primary font-medium transition-colors disabled:opacity-50"
                  >
                    Didn&apos;t receive the code? Resend
                  </button>
                )}
              </div>

              <p className="text-[11px] text-landing-muted/40 text-center leading-relaxed">
                The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Enter New Password ── */}
        {step === 'enter-password' && (
          <motion.div
            key="step-password"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-landing-foreground">Set New Password</h2>
                <p className="text-sm text-landing-muted">
                  {userName
                    ? <>For <span className="text-landing-foreground font-medium">{userName}</span></>
                    : <>Create a new password for your account</>
                  }
                </p>
              </div>
            </div>

            {/* Verified badge */}
            <div className="mt-5 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-400">Email verified successfully</p>
                <p className="text-sm text-landing-foreground truncate">{maskedEmail}</p>
              </div>
            </div>

            <div className="space-y-4 mt-5">
              <div>
                <AuthInput
                  icon={Lock}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(v) => { setNewPassword(v); setError('') }}
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
                <StrengthBar password={newPassword} />
              </div>

              <div>
                <AuthInput
                  icon={Lock}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(v) => { setConfirmPassword(v); setError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleResetPassword() }}
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
                    className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Passwords do not match
                  </motion.p>
                )}
                {passwordsMatch && confirmPassword.length > 0 && newPassword.length >= 6 && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Passwords match
                  </motion.p>
                )}
              </div>

              {/* Password requirements */}
              <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                <p className="text-[11px] text-landing-muted/60 font-medium">Password requirements:</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <RequirementCheck label="At least 6 characters" met={newPassword.length >= 6} />
                  <RequirementCheck label="Uppercase letter" met={/[A-Z]/.test(newPassword)} />
                  <RequirementCheck label="Number" met={/[0-9]/.test(newPassword)} />
                  <RequirementCheck label="Special character" met={/[^A-Za-z0-9]/.test(newPassword)} />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center flex items-center justify-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleResetPassword}
                disabled={loading || !passwordsMatch || newPassword.length < 6}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Resetting password...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Reset Password
                    <KeyRound className="w-4 h-4" />
                  </span>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 'success' && (
          <motion.div
            key="step-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center text-center py-4"
          >
            <div className="relative mb-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 250 }}
                  className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="absolute inset-0 w-20 h-20 rounded-full border-2 border-emerald-400/40"
              />
            </div>

            <h2 className="text-2xl font-bold text-landing-foreground mb-2">Password Reset!</h2>
            <p className="text-sm text-landing-muted max-w-[260px] leading-relaxed mb-8">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBackToLogin}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300"
            >
              <span className="flex items-center justify-center gap-2">
                Back to Sign In
                <ArrowRight className="w-4 h-4" />
              </span>
            </motion.button>

            <p className="text-[11px] text-landing-muted/50 mt-4">
              Use your email and new password to log in
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   PASSWORD REQUIREMENT CHECK
   ═══════════════════════════════════════════════ */

function RequirementCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        animate={{ scale: met ? 1 : 0.8, opacity: met ? 1 : 0.3 }}
        transition={{ duration: 0.2 }}
        className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: met ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)' }}
      >
        {met && <Check className="w-2 h-2 text-emerald-400" />}
      </motion.div>
      <span className={`text-[10px] transition-colors duration-200 ${met ? 'text-emerald-400/80' : 'text-landing-muted/40'}`}>
        {label}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   SIGNUP FORM (OTP-based 2-step flow)
   ═══════════════════════════════════════════════ */

type SignupStep = 'enter-details' | 'verify-otp' | 'success'

function SignupForm({ onSwitch, onForgotPassword }: { onSwitch: () => void; onForgotPassword: () => void }) {
  const setShowAuth = useAppStore((s) => s.setShowAuth)
  const setLaunchedApp = useAppStore((s) => s.setLaunchedApp)

  // Step state
  const [step, setStep] = useState<SignupStep>('enter-details')

  // Step 1: Form fields
  const [fullName, setFullName] = useState('')
  const [pharmacyName, setPharmacyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [formError, setFormError] = useState('')

  // Step 2: OTP verification
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Shared
  const [loading, setLoading] = useState(false)

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword

  // ── Step 1: Submit signup form ──
  const handleSignup = async () => {
    if (!fullName || !pharmacyName || !email || !phone || !password || !confirmPassword || !agreed) {
      setFormError('Please fill in all fields and agree to the terms')
      return
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters')
      return
    }
    setFormError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          businessName: pharmacyName,
          email,
          phone,
          password,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      // Move to OTP verification step
      setMaskedEmail(data.maskedEmail || email)
      setOtp('')
      setOtpError('')
      setResendCooldown(60)
      setStep('verify-otp')
    } catch {
      setFormError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter the complete 6-digit code')
      return
    }
    setOtpError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp }),
      })
      const data = await res.json()

      if (!res.ok) {
        setOtpError(data.error || 'Verification failed')
        setLoading(false)
        return
      }

      setStep('success')
    } catch {
      setOtpError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ──
  const handleResendOtp = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/resend-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setOtpError(data.error || 'Failed to resend code')
        setLoading(false)
        return
      }

      setOtp('')
      setOtpError('')
      setResendCooldown(60)
    } catch {
      setOtpError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Back navigation ──
  const handleBack = () => {
    if (step === 'enter-details') {
      onSwitch()
    } else if (step === 'verify-otp') {
      setStep('enter-details')
      setOtp('')
      setOtpError('')
    }
  }

  // ── Success → go to login ──
  const handleGoToLogin = () => {
    setStep('enter-details')
    setFullName('')
    setPharmacyName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setConfirmPassword('')
    setAgreed(false)
    setOtp('')
    setMaskedEmail('')
    setFormError('')
    setOtpError('')
    setShowAuth(false)
    // Brief delay then show login
    setTimeout(() => {
      setShowAuth(true)
      // The parent will handle switching to login mode
      onSwitch()
    }, 100)
  }

  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Back button */}
      {step !== 'success' && (
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs text-landing-muted hover:text-landing-foreground transition-colors mb-4 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          {step === 'enter-details' ? 'Back to login' : 'Change details'}
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* ═══ Step 1: Enter Details ═══ */}
        {step === 'enter-details' && (
          <motion.div
            key="signup-details"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-2xl font-bold text-landing-foreground mb-1">Create your account</h2>
            <p className="text-sm text-landing-muted mb-6">Get started with PharmPOS for free</p>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 scroll-container">
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
                    className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Passwords do not match
                  </motion.p>
                )}
              </div>

              {/* Password requirements */}
              <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                <p className="text-[11px] text-landing-muted/60 font-medium">Password requirements:</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <RequirementCheck label="At least 6 characters" met={password.length >= 6} />
                  <RequirementCheck label="Uppercase letter" met={/[A-Z]/.test(password)} />
                  <RequirementCheck label="Number" met={/[0-9]/.test(password)} />
                  <RequirementCheck label="Special character" met={/[^A-Za-z0-9]/.test(password)} />
                </div>
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

              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center flex items-center justify-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {formError}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSignup}
                disabled={loading || !agreed || !passwordsMatch || !fullName || !pharmacyName || !email || !phone || !password || !confirmPassword}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
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
        )}

        {/* ═══ Step 2: Verify OTP ═══ */}
        {step === 'verify-otp' && (
          <motion.div
            key="signup-otp"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <MailCheck className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-landing-foreground">Verify Your Email</h2>
                <p className="text-sm text-landing-muted">
                  We sent a code to <span className="text-landing-foreground font-medium">{maskedEmail}</span>
                </p>
              </div>
            </div>

            {/* Email preview */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="mt-5 rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400/60" />
                <div className="w-2 h-2 rounded-full bg-amber-400/60" />
                <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <span className="ml-2 text-[10px] text-landing-muted/50 font-mono">mail.pharmpos.com</span>
              </div>
              <div className="p-4">
                <p className="text-[11px] text-landing-muted/40 mb-1">From: PharmPOS &lt;noreply@pharmpos.com&gt;</p>
                <p className="text-[11px] text-landing-muted/40 mb-2">To: {maskedEmail}</p>
                <p className="text-sm text-landing-foreground font-medium">Welcome to PharmPOS!</p>
                <p className="text-xs text-landing-muted mt-1.5 leading-relaxed">
                  Your 6-digit verification code is:
                </p>
                <div className="mt-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-center">
                  <span className="text-xl font-bold font-mono tracking-[0.3em] text-primary">
                    {/* OTP shown here — in production, only sent to email */}
                    {'••••••'}
                  </span>
                </div>
                <p className="text-[10px] text-landing-muted/40 mt-2 leading-relaxed">
                  Enter this code below to activate your account.
                </p>
              </div>
            </motion.div>

            <div className="space-y-4 mt-5">
              <div>
                <p className="text-xs text-landing-muted mb-3 text-center font-medium">Enter verification code</p>
                <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpError('') }} error={!!otpError} />
              </div>

              {otpError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center flex items-center justify-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {otpError}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Verify &amp; Activate
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </motion.button>

              {/* Resend / Timer */}
              <div className="flex items-center justify-center gap-2 text-xs">
                {resendCooldown > 0 ? (
                  <span className="text-landing-muted/60">
                    Resend code in <CountdownTimer seconds={resendCooldown} onExpire={() => setResendCooldown(0)} />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-primary/80 hover:text-primary font-medium transition-colors disabled:opacity-50"
                  >
                    Didn&apos;t receive the code? Resend
                  </button>
                )}
              </div>

              <p className="text-[11px] text-landing-muted/40 text-center leading-relaxed">
                The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.
              </p>
            </div>
          </motion.div>
        )}

        {/* ═══ Step 3: Success ═══ */}
        {step === 'success' && (
          <motion.div
            key="signup-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center text-center py-4"
          >
            <div className="relative mb-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 250 }}
                  className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="absolute inset-0 w-20 h-20 rounded-full border-2 border-emerald-400/40"
              />
            </div>

            <h2 className="text-2xl font-bold text-landing-foreground mb-2">Account Created!</h2>
            <p className="text-sm text-landing-muted max-w-[260px] leading-relaxed mb-3">
              Your email has been verified. Welcome to PharmPOS!
            </p>

            {/* Quick stats */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="w-full mb-6 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-medium text-emerald-400">Free 30-day trial activated</p>
                  <p className="text-[11px] text-landing-muted truncate">{maskedEmail}</p>
                </div>
              </div>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoToLogin}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-primary via-emerald-500 to-teal-400 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-300"
            >
              <span className="flex items-center justify-center gap-2">
                Continue to Sign In
                <ArrowRight className="w-4 h-4" />
              </span>
            </motion.button>

            <p className="text-[11px] text-landing-muted/50 mt-4">
              Use your email and password to log in
            </p>
          </motion.div>
        )}
      </AnimatePresence>
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

type AuthMode = 'login' | 'signup' | 'forgot-password'

export function AuthPage() {
  const setShowAuth = useAppStore((s) => s.setShowAuth)
  const [mode, setMode] = useState<AuthMode>('login')

  const isForgotPassword = mode === 'forgot-password'

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
        onClick={() => { setShowAuth(false); if (isForgotPassword) setMode('login') }}
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

              {/* Mode toggle tabs — hidden during forgot password */}
              {!isForgotPassword && (
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
              )}

              {/* Forms with AnimatePresence */}
              <AnimatePresence mode="wait">
                {mode === 'login' && (
                  <LoginForm
                    key="login-form"
                    onSwitch={() => setMode('signup')}
                    onForgotPassword={() => setMode('forgot-password')}
                  />
                )}
                {mode === 'signup' && (
                  <SignupForm
                    key="signup-form"
                    onSwitch={() => setMode('login')}
                    onForgotPassword={() => setMode('forgot-password')}
                  />
                )}
                {mode === 'forgot-password' && (
                  <ForgotPasswordForm
                    key="forgot-form"
                    onBack={() => setMode('login')}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
