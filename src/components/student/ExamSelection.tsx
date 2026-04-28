'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

interface Exam { id: string; title: string; description: string; }

export default function ExamSelection({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { studentAuth } = useAuth()
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(false)

  const fetchExams = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/exam/list`, {
        headers: { 'Authorization': `Bearer ${studentAuth?.token}` }
      })
      const data = await response.json()
      setExams(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch exams', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentAuth?.token) {
      fetchExams()
    }
  }, [studentAuth?.token])

  return (
    <div className="mt-4 lg:mt-8 flex flex-col gap-6">
      <div className="relative rounded-3xl border border-white/10 bg-white/5 p-4 lg:p-10 shadow-2xl backdrop-blur-xl min-h-[400px]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white tracking-tight">Select Available Exam</h3>
                <button onClick={fetchExams} className="text-xs font-bold uppercase tracking-widest text-[#0091ad] hover:text-white transition-all flex items-center gap-2">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh List
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {exams.length > 0 ? (
                  exams.map(exam => (
                    <div key={exam.id} className="p-8 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#0091ad]/40 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all rotate-12">
                        <FileText className="w-20 h-20" />
                      </div>
                      <div className="relative z-10">
                        <h4 className="text-xl font-extrabold text-[#0091ad] mb-3">{exam.title}</h4>
                        <p className="text-sm text-white/50 mb-8 line-clamp-3 leading-relaxed">{exam.description || 'Comprehensive assessment for the current module.'}</p>
                        <button
                          onClick={() => router.push(`/dashboard/exam/${exam.id}`)}
                          className="w-full py-4 rounded-2xl bg-[#0091ad] hover:bg-[#007a91] text-white font-bold shadow-lg shadow-[#0091ad]/20 transition-all active:scale-95"
                        >
                          Launch Exam Environment
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-20 bg-white/2 rounded-3xl border border-dashed border-white/10 text-center text-white/30 font-medium">No active examinations found.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#0091ad] mb-6">Examination Rules</h4>
              <div className="space-y-2">
                {[
                  'Maintain constant eye contact with the display.',
                  'Ensure your environment remains quiet and isolated.',
                  'Avoid unauthorized materials or electronic devices.',
                  'Maintain consistent center-face alignment.'
                ].map((rule, i) => (
                  <div key={i} className="rounded-2xl border border-white/5 bg-white/2 p-3 flex gap-1 hover:bg-white/5 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-[#0091ad]/10 text-[#0091ad] flex items-center justify-center font-black text-sm shrink-0">
                      0{i + 1}
                    </div>
                    <span className="text-sm text-white/70 font-medium leading-normal">{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
