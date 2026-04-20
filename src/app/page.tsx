'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import ExamDashboard from '@/components/ExamDashboard'
import AdminDashboard from '@/components/AdminDashboard'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { auth, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !auth?.token) {
      router.push('/login')
    }
  }, [auth, loading, router])

  if (loading || !auth?.token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#44A194]" />
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">
            Authenticating Session
          </div>
        </div>
      </div>
    )
  }

  // Use internal API routes
  const apiBaseUrl = '/api'

  return auth.role === 'admin' ? (
    <AdminDashboard apiBaseUrl={apiBaseUrl} auth={auth} onLogout={logout} />
  ) : (
    <ExamDashboard apiBaseUrl={apiBaseUrl} auth={auth} onLogout={logout} />
  )
}
