'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/api'
import { clearStudentAuth, loadViolationCount, markBanned, saveViolationCount } from '@/lib/storage'
import { useAuth } from '@/lib/AuthContext'
import { DetectionStatus } from '@/components/ProctorCanvas'
import DetectionStatusPanel from '@/components/DetectionStatusPanel'
import { Camera, AlertTriangle, ChevronLeft, Loader2 } from 'lucide-react'

import ProctorCanvas from '@/components/ProctorCanvas'

interface Question { id: string; questionText: string; options: string[]; correctIndex: number; }

export default function ActiveExam({ apiBaseUrl, examId }: { apiBaseUrl: string; examId: string }) {
  const { studentAuth, logoutStudent } = useAuth()
  const router = useRouter()

  const matricNumber = studentAuth?.user?.matricNumber || studentAuth?.user?.username || 'unknown'

  const [violationCount, setViolationCount] = useState(() => loadViolationCount(matricNumber))
  const [activeWarning, setActiveWarning] = useState('')
  const [terminated, setTerminated] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
    faceDetected: false, multipleFaces: false, phoneDetected: false, bookDetected: false, laptopDetected: false, tabletDetected: false
  })

  const violationCountRef = useRef(violationCount)

  useEffect(() => {
    violationCountRef.current = violationCount
    saveViolationCount(matricNumber, violationCount)
  }, [matricNumber, violationCount])

  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch(`${apiBaseUrl}/exam/questions/${examId}`, {
          headers: { 'Authorization': `Bearer ${studentAuth?.token}` }
        })
        const data = await response.json()
        setQuestions(Array.isArray(data) ? data : [])
      } catch {
        alert('Failed to load exam questions')
      } finally {
        setLoadingQuestions(false)
      }
    }
    if (studentAuth?.token) loadQuestions()
  }, [apiBaseUrl, examId, studentAuth?.token])

  const submitExam = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`${apiBaseUrl}/exam/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentAuth?.token}` },
        body: JSON.stringify({ matricNumber, examId, answers, questions })
      })
      const data = await res.json()
      if (res.ok && data.score !== undefined) {
        sessionStorage.setItem(`exam_score_${examId}`, JSON.stringify({ score: data.score, total: data.total }))
        router.push(`/dashboard/exam/${examId}/success`)
      } else {
        throw new Error(data.message || 'Failed to submit exam. Please try again.')
      }
    } catch (e: any) {
      console.error('Failed to submit exam result', e)
      alert(e.message || 'Connection error. Please check your internet and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const strikeLimit = 10
  const onStrike = async ({ type, message, meta }: any) => {
    setActiveWarning(message || 'Warning: Irregularity Detected!')
    const nextCount = Math.min(strikeLimit, (violationCountRef.current || 0) + 1)
    violationCountRef.current = nextCount
    setViolationCount(nextCount)
    saveViolationCount(matricNumber, nextCount)

    try {
      await apiPost(
        `${apiBaseUrl}/proctor/report-violation`,
        { matricNumber, type, message, meta, client_violation_count: nextCount, timestamp: new Date().toISOString() },
        { token: studentAuth?.token }
      )
    } catch { }
  }

  const hardTerminate = async () => {
    const msg = 'You have been logged out due to ten consecutive irregularities. Contact your administrator.'
    markBanned(matricNumber, msg)
    try {
      await apiPost(
        `${apiBaseUrl}/proctor/report-violation`,
        { matricNumber, type: 'TEN_STRIKES_BAN', message: msg, meta: { violationCount: 10 }, client_violation_count: 10, timestamp: new Date().toISOString() },
        { token: studentAuth?.token }
      )
    } catch { }
    logoutStudent()
    setTerminated(true)
    router.push('/login?kickedOut=true')
  }

  useEffect(() => {
    if (violationCount >= strikeLimit && !terminated) {
      hardTerminate()
    }
  }, [violationCount, terminated])

  const statusPill = useMemo(() => {
    if (terminated) return { text: 'Session Terminated', cls: 'bg-red-500/15 text-red-200 border-red-500/30' }
    return { text: 'Monitoring Active', cls: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' }
  }, [terminated])

  return (
    <>
      <div className="flex items-center justify-between border-t lg:border-none border-white/5 pt-4 lg:pt-0 mb-6">
        <div className={['rounded-full border px-4 py-1.5 text-[10px] lg:text-xs font-black uppercase tracking-widest', statusPill.cls].join(' ')}>
          {statusPill.text}
        </div>
      </div>

      <div className="mt-4 lg:mt-8 flex flex-col gap-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 shadow-2xl shadow-red-500/5">
          <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase tracking-widest mb-2">
            <AlertTriangle className="w-4 h-4" /> Critical Warning
          </div>
          <p className="text-[11px] lg:text-xs text-red-200/50 leading-relaxed font-bold uppercase tracking-tight">
            Exceeding 10 irregularities will trigger an automatic <span className="text-red-400">permanent suspension</span>. Results will be invalidated.
          </p>
        </div>

        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-4 lg:p-10 shadow-2xl backdrop-blur-xl min-h-[400px]">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="mb-8 flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10">
                <div>
                  <h2 className="text-2xl font-bold text-white">Question {currentQuestionIndex + 1}</h2>
                  <p className="text-sm text-white/50 mt-1">Select the best answer from the options provided.</p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                  <span className="text-xs font-bold text-[#0091ad] uppercase tracking-widest">{currentQuestionIndex + 1} / {questions.length}</span>
                </div>
              </div>

              {!loadingQuestions && questions.length > 0 ? (
                <div className="mb-2">
                  <p className="text-xl text-white font-medium leading-relaxed mb-8">{questions[currentQuestionIndex].questionText}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {questions[currentQuestionIndex].options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => setAnswers({ ...answers, [currentQuestionIndex]: option })}
                        className={['w-full text-left p-2 rounded-2xl border-2 transition-all group relative overflow-hidden',
                          answers[currentQuestionIndex] === option ? 'bg-[#0091ad]/20 border-[#0091ad] ring-4 ring-[#0091ad]/10' : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'].join(' ')}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div className={['w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border transition-all',
                            answers[currentQuestionIndex] === option ? 'bg-[#0091ad] border-[#0091ad] text-white' : 'bg-white/10 border-white/10 text-white/40'].join(' ')}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className={['text-lg transition-all', answers[currentQuestionIndex] === option ? 'text-white font-semibold' : 'text-white/70'].join(' ')}>{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : !loadingQuestions && questions.length === 0 ? (
                <div className="py-20 text-center">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-white/70 font-bold">No questions found for this exam.</p>
                  <p className="text-white/30 text-sm mt-2">Please contact your administrator if this is an error.</p>
                </div>
              ) : (
                <div className="py-20 text-center">
                  <Loader2 className="animate-spin h-10 w-10 text-[#0091ad] mx-auto mb-4" />
                  <p className="text-white/50">Loading questions...</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-8 border-t border-white/10 mt-12">
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold transition-all flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-10 py-3 rounded-2xl bg-[#0091ad] hover:bg-[#007a91] text-sm font-bold text-white shadow-lg shadow-[#0091ad]/20 transition-all active:scale-95"
                  >
                    Next Question
                  </button>
                ) : (
                  questions.length > 0 && (
                    <button
                      onClick={() => setShowConfirmSubmit(true)}
                      className="px-10 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      Submit Exam
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="lg:w-96">
              <div className="sticky top-6 space-y-3">
                <div className="bg-black/40 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest text-white/70 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Live Feed</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium bg-red-500/10 text-red-400 px-2 py-1 rounded-lg border border-red-500/20">
                      Strikes: {violationCount}/10
                    </div>
                  </div>

                  <div className="aspect-video relative">
                    <ProctorCanvas
                      enabled={!terminated}
                      apiBaseUrl={apiBaseUrl}
                      matricNumber={matricNumber}
                      authToken={studentAuth?.token}
                      violationCount={violationCount}
                      onStrike={onStrike}
                      onWarning={(msg) => setActiveWarning(msg)}
                      onStatusUpdate={setDetectionStatus}
                    />
                  </div>
                </div>

                {activeWarning && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 animate-fade-in flex gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="font-semibold">{activeWarning}</span>
                  </div>
                )}
                <DetectionStatusPanel status={detectionStatus} />
              </div>
            </div>
          </div>
        </div>

        {showConfirmSubmit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-[#0d2040] border border-white/10 rounded-3xl p-10 shadow-2xl transform scale-in-center overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0091ad] to-transparent" />
              <h3 className="text-2xl font-black text-white mb-3">Final Submission?</h3>
              <p className="text-white/50 mb-10 leading-relaxed">
                You have completed <span className="text-white font-bold">{Object.keys(answers).length} / {questions.length}</span> questions. Once submitted, your answers cannot be altered.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all"
                >
                  Review
                </button>
                <button
                  onClick={submitExam}
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl bg-[#0091ad] hover:bg-[#007a91] text-white font-bold transition-all shadow-lg shadow-[#0091ad]/20 active:scale-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Saving...</> : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
