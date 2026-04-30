'use client'
import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { apiPost } from '@/lib/api'
import {
  ShieldCheck,
  Key,
  Lock,
  Loader2,
  AlertCircle,
  LayoutDashboard
} from 'lucide-react'

export default function AdminLoginPage() {
  const context = useAuth()
  const auth = context.adminAuth !== undefined ? context.adminAuth : context.auth
  const login = context.loginAdmin || context.login
  const loading = context.loading
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // If already logged in as admin, redirect to dashboard
  useEffect(() => {
    if (!loading && auth?.token && auth?.role === 'admin') {
      router.push('/admin/dashboard')
    }
  }, [auth, loading, router])

  if (loading || (auth?.token && auth?.role === 'admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c1929]">
        <Loader2 className="h-12 w-12 animate-spin text-[#0091ad]" />
      </div>
    )
  }

  const canSubmit = !submitting && username.trim().length > 0 && password.length > 0

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const data = await apiPost('/api/auth/admin-login', { username, password })
      login({
        token: data?.token || 'dev-token',
        role: 'admin',
        user: {
          id: data?.user?.id,
          username: data?.user?.username || data?.username || username,
        },
      })
      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 lg:p-10 shadow-2xl relative overflow-hidden group">

        {/* Decorative icon */}
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <ShieldCheck className="w-32 h-32 rotate-12" />
        </div>

        {/* Header */}
        <div className="mb-10 relative z-10">
          <div className="text-xs font-bold uppercase text-[#0091ad] flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4" /> Restricted Access
          </div>
          <div className="text-2xl font-bold text-white">Administrator Sign In</div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 flex gap-3 items-center animate-fade-in relative z-10">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <div className="font-medium">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-5 relative z-10">
          {/* Username */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 pl-1">
              Admin Username
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 pl-12 outline-none focus:border-[#0091ad] focus:ring-4 focus:ring-[#0091ad]/10 transition-all font-bold text-white placeholder:text-white/10"
                placeholder="admin@gmail.com"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 pl-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 pl-12 outline-none focus:border-[#0091ad] focus:ring-4 focus:ring-[#0091ad]/10 transition-all font-bold text-white placeholder:text-white/10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full mt-4 rounded-2xl py-5 font-black uppercase tracking-[0.2em] text-[11px] transition-all active:scale-[0.98] flex items-center justify-center gap-3 bg-[#0091ad] hover:bg-[#007a91] text-white shadow-2xl shadow-[#0091ad]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Access Dashboard
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
