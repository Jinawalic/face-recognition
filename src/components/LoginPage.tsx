'use client'
import { useEffect, useMemo, useState, FormEvent } from 'react'
import { apiPost } from '@/lib/api'
import { getBannedMessage, isLocallyBanned, normalizeMatric, AuthState } from '@/lib/storage'
import {
  ShieldCheck,
  User,
  Lock,
  Key,
  AlertCircle,
  Loader2,
  GraduationCap,
  ShieldAlert
} from 'lucide-react'

interface LoginPageProps {
  apiBaseUrl: string;
  onLoginSuccess: (auth: AuthState) => void;
}

export default function LoginPage({ apiBaseUrl, onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<'student' | 'admin'>('student')

  const [matricNumber, setMatricNumber] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [userStatus, setUserStatus] = useState<'active' | 'banned'>('active')
  const [bannedBanner, setBannedBanner] = useState('')

  const locallyBanned = useMemo(() => {
    if (mode !== 'student') return false
    const key = normalizeMatric(matricNumber)
    return key ? isLocallyBanned(key) : false
  }, [mode, matricNumber])

  useEffect(() => {
    const key = normalizeMatric(matricNumber)
    if (mode === 'student' && key && locallyBanned) {
      setUserStatus('banned')
      setBannedBanner(
        getBannedMessage(key) ||
        'You have been logged out due to three consecutive irregularities. Contact your administrator.',
      )
    } else if (!locallyBanned) {
      setUserStatus('active')
      setBannedBanner('')
    }
  }, [mode, matricNumber, locallyBanned])

  const canSubmit =
    !submitting &&
    (mode === 'student'
      ? normalizeMatric(matricNumber).length > 0 && userStatus !== 'banned'
      : adminUsername.trim().length > 0 && adminPassword.length > 0)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!canSubmit) return

    setSubmitting(true)
    try {
      if (mode === 'student') {
        const matric = normalizeMatric(matricNumber)
        const data = await apiPost(`${apiBaseUrl}/auth/student-login`, { matricNumber: matric })

        if (data?.is_banned) {
          setUserStatus('banned')
          setBannedBanner(
            data?.message ||
            'You have been logged out due to three consecutive irregularities. Contact your administrator.',
          )
          return
        }

        onLoginSuccess({
          token: data?.token || 'dev-token',
          role: 'student',
          user: {
            matricNumber: data?.matricNumber || matric,
            surname: data?.surname || '',
            firstName: data?.firstName || '',
            lastName: data?.lastName || '',
            department: data?.department || ''
          },
        })
      } else {
        const data = await apiPost(`${apiBaseUrl}/auth/admin-login`, {
          username: adminUsername,
          password: adminPassword,
        })

        onLoginSuccess({
          token: data?.token || 'dev-token',
          role: 'admin',
          user: { username: data?.username || adminUsername },
        })
      }
    } catch (err: any) {
      if (err?.status === 403 && err?.data?.is_banned) {
        setUserStatus('banned')
        setBannedBanner(
          err?.data?.message ||
          'You have been logged out due to three consecutive irregularities. Contact your administrator.',
        )
      } else {
        setError(err?.message || 'Login failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6 mt-25 overflow-y-hidden">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <ShieldCheck className="w-32 h-32 rotate-12" />
        </div>

        <div className="mb-8 relative z-10">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#44A194] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Proctoring System
          </div>
          <div className="text-2xl font-bold tracking-tighter text-white mt-1">Sign In</div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1 relative z-10">
          <button
            type="button"
            onClick={() => {
              setMode('student')
              setError('')
            }}
            className={[
              'rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
              mode === 'student'
                ? 'bg-[#44A194] text-white shadow-xl shadow-[#44A194]/20'
                : 'bg-transparent text-white/40 hover:bg-white/5 hover:text-white',
            ].join(' ')}
          >
            <GraduationCap className="w-4 h-4" /> Student
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin')
              setError('')
              setBannedBanner('')
              setUserStatus('active')
            }}
            className={[
              'rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
              mode === 'admin'
                ? 'bg-[#44A194] text-white shadow-xl shadow-[#44A194]/20'
                : 'bg-transparent text-white/40 hover:bg-white/5 hover:text-white',
            ].join(' ')}
          >
            <ShieldCheck className="w-4 h-4" /> Admin
          </button>
        </div>

        {bannedBanner ? (
          <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-200 flex gap-3 items-start animate-fade-in relative z-10">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <div className="font-medium leading-relaxed">{bannedBanner}</div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100 flex gap-3 items-center animate-fade-in relative z-10">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="font-medium">{error}</div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-6 relative z-10">
          {mode === 'student' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 pl-1">Identification</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                  required
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 pl-12 outline-none focus:border-[#44A194] focus:ring-4 focus:ring-[#44A194]/10 transition-all font-bold text-white placeholder:text-white/10"
                  placeholder="CSC/21/XXXX"
                  autoComplete="username"
                />
              </div>
              <div className="text-[9px] text-white/20 uppercase font-black tracking-widest pl-1 mt-2">
                Standard Matriculation Format
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 pl-1">Admin UID</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 pl-12 outline-none focus:border-[#44A194] transition-all font-bold text-white placeholder:text-white/10"
                    placeholder="Username"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 pl-1">Passkey</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 pl-12 outline-none focus:border-[#44A194] transition-all font-bold text-white placeholder:text-white/10"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            disabled={(mode === 'student' && userStatus === 'banned') || submitting}
            className={[
              'w-full rounded-2xl py-5 font-black uppercase tracking-[0.2em] text-[11px] transition-all active:scale-[0.98] flex items-center justify-center gap-3',
              mode === 'student' && userStatus === 'banned'
                ? 'bg-red-500/10 border border-red-500/20 text-red-400 cursor-not-allowed'
                : 'bg-[#44A194] hover:bg-[#3B8F83] text-white shadow-2xl shadow-[#44A194]/30',
            ].join(' ')}
            type="submit"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (mode === 'student' && userStatus === 'banned') ? (
              'Suspended'
            ) : (
              'Initialise Session'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
