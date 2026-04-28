'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowLeft } from 'lucide-react'

export default function ExamSuccess({ examId }: { examId: string }) {
  const router = useRouter()
  const [examScore, setExamScore] = useState<{ score: number; total: number } | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(`exam_score_${examId}`)
    if (raw) {
      setExamScore(JSON.parse(raw))
    }
  }, [examId])

  return (
    <div className="w-[50%] mx-auto mt-4 lg:mt-8 flex flex-col gap-1 animate-fade-in">
      <div className="relative rounded-3xl border border-white/10 bg-white/5 p-4 lg:p-10 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-3xl border border-emerald-500/20 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/5">
            <Check className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold mb-4 text-white tracking-tight">Exam Submitted Successfully!</h2>

          <p className="text-white/50 mb-10 max-w-md mx-auto text-lg leading-relaxed">
            Your performance and proctoring data have been securely uploaded. You may now exit or return to the portal.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-10 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold transition-all active:scale-95 flex items-center gap-3"
          >
            <ArrowLeft className="w-5 h-5" />
            Return to Portal
          </button>
        </div>
      </div>
    </div>
  )
}
