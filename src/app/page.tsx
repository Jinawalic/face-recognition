'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { adminAuth, studentAuth, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      router.push('/login')
    }
  }, [loading, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c1929]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#0091ad]" />
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">
          Routing Session
        </div>
      </div>
    </div>
  )
}
