'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import LoginPage from '@/components/LoginPage'
import { Loader2 } from 'lucide-react'

export default function Login() {
  const { auth, login, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && auth?.token) {
      router.push('/')
    }
  }, [auth, loading, router])

  if (loading || auth?.token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#44A194]" />
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">
            Redirecting to Portal
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <LoginPage apiBaseUrl="/api" onLoginSuccess={login} />
    </div>
  )
}
