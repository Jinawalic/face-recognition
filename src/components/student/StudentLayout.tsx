'use client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { studentAuth, logoutStudent, loading } = useAuth()
  const router = useRouter()

  if (loading) return null

  if (!studentAuth?.token) {
    router.push('/login')
    return null
  }

  const matricNumber = studentAuth?.user?.matricNumber || studentAuth?.user?.username || 'unknown'
  const fullName = [studentAuth?.user?.surname, studentAuth?.user?.firstName, studentAuth?.user?.lastName]
    .filter(Boolean)
    .join(' ') || studentAuth?.user?.username || matricNumber

  return (
    <div className="min-h-screen bg-[#0c1929]">
      <div className="mx-auto max-w-6xl p-4 lg:p-6 pb-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between py-6">
          <div>
            <div className="text-2xl lg:text-3xl font-black tracking-tight text-white mt-1">
              Welcome, <span className="text-[#0091ad]">{fullName}</span>
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-3 border-t lg:border-none border-white/5 pt-4 lg:pt-0">
            <button
              onClick={() => {
                logoutStudent()
                router.push('/login')
              }}
              className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 lg:px-6 py-2.5 text-xs lg:text-sm font-black transition-all backdrop-blur-sm flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
