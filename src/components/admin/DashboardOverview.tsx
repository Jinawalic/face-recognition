'use client'
import { useMemo } from 'react'
import { Users, BookOpen, ShieldBan, BarChart3, RefreshCw } from 'lucide-react'
import { useAdminData } from '@/hooks/useAdminData'
import { useRouter } from 'next/navigation'

export default function DashboardOverview() {
  const { students, exams } = useAdminData()
  const router = useRouter()

  const stats = useMemo(() => {
    const totalExamsTaken = students.reduce((acc, s) => acc + s.results.length, 0)
    return [
      { label: 'Total Students', value: students.length, icon: Users, color: 'bg-blue-500' },
      { label: 'Courses/Exams', value: exams.length, icon: BookOpen, color: 'bg-purple-500' },
      { label: 'Banned Students', value: students.filter(s => s.is_banned).length, icon: ShieldBan, color: 'bg-red-500' },
      { label: 'Total Results', value: totalExamsTaken, icon: BarChart3, color: 'bg-emerald-500' },
    ]
  }, [students, exams])

  return (
    <>
      <div className="mb-10 lg:mb-12">
        <h1 className="text-xl lg:text-2xl font-bold text-white capitalize">Dashboard</h1>
        <p className="text-white/40 mt-2 font-medium">Manage your examination environment and student records.</p>
      </div>
      <div className="space-y-12 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/5 shadow-2xl relative overflow-hidden group hover:border-[#0091ad]/40 transition-all">
              <div className={['absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-10 group-hover:opacity-20 transition-all rounded-full', s.color].join(' ')} />
              <div className="relative z-10 flex gap-4">
                <div className={['w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6', s.color].join(' ')}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white mb-1">{s.value}</div>
                  <div className="text-sm font-bold capitalize text-white/30">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-[#0091ad]" /> Recent Registrations
            </h2>
            <button onClick={() => router.push('/admin/view-registered')} className="text-xs font-bold text-[#0091ad] hover:text-white transition-all">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-white/5">
                {students.slice(0, 5).map(s => (
                  <tr key={s.matric_number}>
                    <td className="py-4 font-black text-sm text-[#0091ad]">{s.matric_number}</td>
                    <td className="py-4 text-sm font-semibold">{s.surname} {s.first_name}</td>
                    <td className="py-4 text-sm text-white/40">{s.department}</td>
                    <td className="py-4 text-right">
                      <div className={['w-2 h-2 rounded-full inline-block', s.is_banned ? 'bg-red-500' : 'bg-emerald-500'].join(' ')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
