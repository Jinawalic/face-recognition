'use client'
import { useEffect, useState, FormEvent } from 'react'
import { apiPost } from '@/lib/api'
import { normalizeMatric, clearLocalBan, AuthState } from '@/lib/storage'
import { useSearchParams } from 'next/navigation'
import {
  ShieldCheck,
  User,
  AlertCircle,
  Loader2,
  GraduationCap
} from 'lucide-react'

interface LoginPageProps {
  apiBaseUrl: string;
  onLoginSuccess: (auth: AuthState) => void;
}

export default function LoginPage({ apiBaseUrl, onLoginSuccess }: LoginPageProps) {
  const [matricNumber, setMatricNumber] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')

  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('register') === 'true') {
      setMode('register')
    }
  }, [searchParams])

  const canSubmit =
    !submitting &&
    normalizeMatric(matricNumber).length > 0 &&
    (mode === 'login' || fullName.trim().length > 0)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!canSubmit) return

    setSubmitting(true)
    try {
      const matric = normalizeMatric(matricNumber)
      const endpoint = mode === 'register' ? '/auth/student-register' : '/auth/student-login'
      const payload = mode === 'register'
        ? { matricNumber: matric, fullName: fullName.trim() }
        : { matricNumber: matric }
      const data = await apiPost(`${apiBaseUrl}${endpoint}`, payload)

      clearLocalBan(matric)

      onLoginSuccess({
        token: data?.token || 'dev-token',
        role: 'student',
        user: {
          matricNumber: data?.matricNumber || matric,
          id: data?.user?.id,
          surname: data?.user?.surname || '',
          firstName: data?.user?.firstName || '',
          lastName: data?.user?.lastName || '',
          department: data?.user?.department || ''
        },
      })
    } catch (err: any) {
      if (mode === 'login' && err?.status === 404) {
        setMode('register')
        setError('No account found. Register with your full name and matric number.')
      } else {
        setError(err?.message || 'Login failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-12 lg:py-0 flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 lg:p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <ShieldCheck className="w-32 h-32 rotate-12" />
        </div>

        <div className="mb-8 relative z-10">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#0091ad] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Proctoring System
          </div>
          <div className="text-2xl font-bold tracking-tighter text-white mt-1">Student Sign In</div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100 flex gap-3 items-center animate-fade-in relative z-10">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="font-medium">{error}</div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 pl-1">Identification</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input
                required
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 pl-12 outline-none focus:border-[#0091ad] focus:ring-4 focus:ring-[#0091ad]/10 transition-all font-bold text-white placeholder:text-white/10"
                placeholder="CSC/21/XXXX"
                autoComplete="username"
              />
            </div>
            <div className="text-[9px] text-white/20 uppercase font-black tracking-widest pl-1 mt-2">
              Standard Matriculation Format
            </div>
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 pl-1">Full Name</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 pl-12 outline-none focus:border-[#0091ad] focus:ring-4 focus:ring-[#0091ad]/10 transition-all font-bold text-white placeholder:text-white/10"
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <button
            disabled={submitting || !canSubmit}
            className={[
              'w-full rounded-2xl py-5 font-black uppercase tracking-[0.2em] text-[11px] transition-all active:scale-[0.98] flex items-center justify-center gap-3',
              !canSubmit
                ? 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
                : 'bg-[#0091ad] hover:bg-[#007a91] text-white shadow-2xl shadow-[#0091ad]/30',
            ].join(' ')}
            type="submit"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              mode === 'register' ? 'Create Account' : 'Initialise Session'
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode((current) => (current === 'login' ? 'register' : 'login'))
              setError('')
            }}
            className="w-full text-[10px] font-black uppercase tracking-[0.25em] text-white/30 hover:text-white/60 transition-all"
          >
            {mode === 'login' ? 'New student? Register account' : 'Back to sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
