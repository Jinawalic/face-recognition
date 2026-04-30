'use client'
import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import {
  Users,
  UserPlus,
  FileText,
  LogOut,
  LayoutDashboard,
  BarChart3,
  Menu,
  X,
  ShieldBan
} from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { adminAuth: auth, logoutAdmin: logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && (!auth?.token || auth.role !== 'admin')) {
      router.push('/admin')
    }
  }, [auth, loading, router])

  if (loading || !auth?.token) return null

  const adminName = auth?.user?.username || 'admin'

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/view-registered', label: 'View Students', icon: Users },
    { href: '/admin/configure-exams', label: 'Configure Exams', icon: FileText },
    { href: '/admin/results', label: 'Results', icon: BarChart3 },
    { href: '/admin/violations', label: 'Violations', icon: ShieldBan },
  ]

  return (
    <div className="flex h-screen bg-[#0c1929] text-white overflow-hidden relative">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#091520', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
      }} />
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#091520] border-b border-white/10 z-[100] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0091ad] rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="font-bold text-white text-xs">PROCTORLY</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-white/60 hover:text-white transition-all">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={[
        'fixed lg:relative inset-y-0 left-0 z-[150] w-72 border-r border-white/10 bg-[#091520] flex flex-col shadow-2xl transition-transform duration-300 transform lg:translate-x-0',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ].join(' ')}>
        <div className="p-8 border-b border-white/10 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0091ad] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#0091ad]/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">PROCTOR<span className="text-[#0091ad]">LY</span></div>
              <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-0.5">{adminName}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 mt-16 lg:mt-0">
          {navItems.map(({ href, label, icon: Icon }) => (
            <button
              key={href}
              onClick={() => { router.push(href); setIsSidebarOpen(false); }}
              className={['flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all font-bold text-sm',
                pathname === href ? 'bg-[#0091ad] text-white shadow-xl shadow-[#0091ad]/20' : 'hover:bg-white/5 text-white/40'
              ].join(' ')}
            >
              <Icon className="w-5 h-5" /> {label}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <button onClick={logout} className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-red-400/60 font-bold hover:bg-red-500/10 hover:text-red-400 transition-all text-sm border border-transparent hover:border-red-500/20">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#0c1929] p-6 lg:p-12 pt-24 lg:pt-12">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
