'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/api'
import { loadViolationCount, saveViolationCount } from '@/lib/storage'
import {
  clearExamSession,
  ensureExamStartAt,
  EXAM_DURATION_MS,
  markExamSubmitted,
} from '@/lib/exam-session'
import { useAuth } from '@/lib/AuthContext'
import { DetectionStatus } from '@/components/ProctorCanvas'
import DetectionStatusPanel from '@/components/DetectionStatusPanel'
import { Camera, AlertTriangle, ChevronLeft, Clock3, Loader2 } from 'lucide-react'

import ProctorCanvas from '@/components/ProctorCanvas'

interface Question {
  id: string
  questionText: string
  options: string[]
  correctIndex: number
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function ActiveExam({ apiBaseUrl, examId }: { apiBaseUrl: string; examId: string }) {
  const { studentAuth } = useAuth()
  const router = useRouter()

  const matricNumber = studentAuth?.user?.matricNumber || studentAuth?.user?.username || 'unknown'

  const [violationCount, setViolationCount] = useState(() => loadViolationCount(matricNumber))
  const [activeWarning, setActiveWarning] = useState('')
  const [terminated, setTerminated] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [examStartAt, setExamStartAt] = useState<number | null>(null)
  const [timeLeftMs, setTimeLeftMs] = useState(EXAM_DURATION_MS)
  const [timeExpired, setTimeExpired] = useState(false)

  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
    faceDetected: false,
    multipleFaces: false,
    phoneDetected: false,
    bookDetected: false,
    laptopDetected: false,
    tabletDetected: false,
  })

  const violationCountRef = useRef(violationCount)
  const answersRef = useRef(answers)
  const questionsRef = useRef(questions)
  const submissionLockedRef = useRef(false)
  const autoSubmitTriggeredRef = useRef(false)

  useEffect(() => {
    violationCountRef.current = violationCount
    saveViolationCount(matricNumber, violationCount)
  }, [matricNumber, violationCount])

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    questionsRef.current = questions
  }, [questions])

  useEffect(() => {
    const startAt = ensureExamStartAt(examId)
    setExamStartAt(startAt)
    const remaining = Math.max(0, EXAM_DURATION_MS - (Date.now() - startAt))
    setTimeLeftMs(remaining)
    setTimeExpired(remaining <= 0)
  }, [examId])

  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch(`${apiBaseUrl}/exam/questions/${examId}`, {
          headers: { Authorization: `Bearer ${studentAuth?.token}` },
        })
        const data = await response.json()

        if (response.status === 409) {
          clearExamSession(examId)
          setAccessError(data?.message || 'You have already taken this exam.')
          setQuestions([])
          return
        }

        if (!response.ok) {
          throw new Error(data?.message || 'Failed to load exam questions')
        }

        setQuestions(Array.isArray(data) ? data : [])
      } catch (error: any) {
        setAccessError(error?.message || 'Failed to load exam questions. Please try again.')
      } finally {
        setLoadingQuestions(false)
      }
    }

    if (studentAuth?.token) loadQuestions()
  }, [apiBaseUrl, examId, studentAuth?.token])

  const submitExam = async (isAutoSubmit = false) => {
    if (submissionLockedRef.current) return

    submissionLockedRef.current = true
    setSubmitting(true)
    let completed = false

    try {
      const res = await fetch(`${apiBaseUrl}/exam/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAuth?.token}` },
        body: JSON.stringify({
          matricNumber,
          examId,
          answers: answersRef.current,
          questions: questionsRef.current,
        }),
      })

      const data = await res.json()

      if (res.ok && data.score !== undefined) {
        completed = true
        markExamSubmitted(examId)
        clearExamSession(examId)
        sessionStorage.setItem(`exam_score_${examId}`, JSON.stringify({ score: data.score, total: data.total }))
        router.push(`/dashboard/exam/${examId}/success`)
        return
      }

      if (res.status === 409) {
        clearExamSession(examId)
        setAccessError(data?.message || 'You have already submitted this exam.')
        return
      }

      throw new Error(data?.message || 'Failed to submit exam. Please try again.')
    } catch (error: any) {
      setSubmitting(false)
      submissionLockedRef.current = false
      if (isAutoSubmit && timeExpired) {
        setAccessError(error?.message || 'Time is up, but the exam could not be submitted automatically.')
        return
      }
      console.error('Failed to submit exam result', error)
      alert(error?.message || 'Connection error. Please check your internet and try again.')
    } finally {
      if (!completed) {
        setSubmitting(false)
        if (!timeExpired) {
          submissionLockedRef.current = false
        }
      }
      console.log('Loading COCO-SSD (mobilenet_v2)...')
    }
  }

  useEffect(() => {
    if (!examStartAt || loadingQuestions || accessError || terminated) return

    const syncTimer = () => {
      const remaining = Math.max(0, EXAM_DURATION_MS - (Date.now() - examStartAt))
      setTimeLeftMs(remaining)
      const expired = remaining <= 0
      setTimeExpired(expired)

      if (expired && !autoSubmitTriggeredRef.current && !submissionLockedRef.current) {
        autoSubmitTriggeredRef.current = true
        void submitExam(true)
      }
    }

    syncTimer()
    const interval = window.setInterval(syncTimer, 1000)
    return () => window.clearInterval(interval)
  }, [accessError, examStartAt, loadingQuestions, terminated])

  const strikeLimit = 10
  const onStrike = async ({ type, message, meta }: any) => {
    setActiveWarning(message || 'Warning: Potential Academic Irregularity Detected!')
    const nextCount = Math.min(strikeLimit, (violationCountRef.current || 0) + 1)
    violationCountRef.current = nextCount
    setViolationCount(nextCount)
    saveViolationCount(matricNumber, nextCount)

    try {
      await apiPost(
        `${apiBaseUrl}/proctor/report-violation`,
        {
          matricNumber,
          type,
          message,
          meta,
          client_violation_count: nextCount,
          timestamp: new Date().toISOString(),
        },
        { token: studentAuth?.token }
      )
    } catch {
      // Ignore proctoring write failures in the UI; the backend still controls submission.
    }
  }

  useEffect(() => {
    if (violationCount >= strikeLimit && !terminated) {
      console.log('Strike limit reached, but auto-kick is disabled as per admin request.')
      // hardTerminate()
    }
  }, [violationCount, terminated])

  const statusPill = useMemo(() => {
    if (terminated) return { text: 'Session Terminated', cls: 'bg-red-500/15 text-red-200 border-red-500/30' }
    if (timeExpired) return { text: 'Time Expired', cls: 'bg-red-500/15 text-red-200 border-red-500/30' }
    return { text: 'Monitoring Active', cls: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' }
  }, [terminated, timeExpired])

  const isExamLocked = terminated || timeExpired || Boolean(accessError)

  if (accessError) {
    return (
      <div className="mt-4 lg:mt-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-8 shadow-2xl shadow-red-500/5">
        <div className="flex items-center gap-2 text-red-300 font-black text-xs uppercase tracking-widest mb-4">
          <AlertTriangle className="w-4 h-4" /> Exam Locked
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">You cannot start this exam again</h2>
        <p className="text-white/70 mb-6 leading-relaxed">{accessError}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 rounded-2xl bg-[#0091ad] hover:bg-[#007a91] text-white font-bold transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between border-t lg:border-none border-white/5 pt-4 lg:pt-0 mb-6 gap-3">
        <div className={['rounded-full border px-4 py-1.5 text-[10px] lg:text-xs font-black uppercase tracking-widest', statusPill.cls].join(' ')}>
          {statusPill.text}
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] lg:text-xs font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-[#0091ad]" />
          {timeExpired ? '00:00' : formatTime(timeLeftMs)}
        </div>
      </div>

      <div className="mt-4 lg:mt-8 flex flex-col gap-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 shadow-2xl shadow-red-500/5">
          <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase tracking-widest mb-2">
            <AlertTriangle className="w-4 h-4" /> Critical Warning
          </div>
          <p className="text-[11px] lg:text-xs text-red-200/50 leading-relaxed font-bold uppercase tracking-tight">
            Irregularities are monitored in real-time and recorded for administrative review. Maintain professional conduct.
          </p>
        </div>

        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-4 lg:p-10 shadow-2xl backdrop-blur-xl min-h-[400px]">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="mb-8 flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Question {currentQuestionIndex + 1}</h2>
                  <p className="text-sm text-white/50 mt-1">Select the best answer from the options provided.</p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                  <span className="text-xs font-bold text-[#0091ad] uppercase tracking-widest">
                    {currentQuestionIndex + 1} / {questions.length}
                  </span>
                </div>
              </div>

              {!loadingQuestions && questions.length > 0 ? (
                <div className="mb-2">
                  <p className="text-xl text-white font-medium leading-relaxed mb-8">{questions[currentQuestionIndex].questionText}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {questions[currentQuestionIndex].options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (isExamLocked || submitting) return
                          setAnswers({ ...answers, [currentQuestionIndex]: option })
                        }}
                        disabled={isExamLocked || submitting}
                        className={[
                          'w-full text-left p-2 rounded-2xl border-2 transition-all group relative overflow-hidden',
                          answers[currentQuestionIndex] === option
                            ? 'bg-[#0091ad]/20 border-[#0091ad] ring-4 ring-[#0091ad]/10'
                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10',
                          isExamLocked || submitting ? 'opacity-70 cursor-not-allowed' : '',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div
                            className={[
                              'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border transition-all',
                              answers[currentQuestionIndex] === option
                                ? 'bg-[#0091ad] border-[#0091ad] text-white'
                                : 'bg-white/10 border-white/10 text-white/40',
                            ].join(' ')}
                          >
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span
                            className={[
                              'text-lg transition-all',
                              answers[currentQuestionIndex] === option ? 'text-white font-semibold' : 'text-white/70',
                            ].join(' ')}
                          >
                            {option}
                          </span>
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
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0 || isExamLocked || submitting}
                  className="px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold transition-all flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    disabled={isExamLocked || submitting}
                    className="px-10 py-3 rounded-2xl bg-[#0091ad] hover:bg-[#007a91] text-sm font-bold text-white shadow-lg shadow-[#0091ad]/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next Question
                  </button>
                ) : (
                  questions.length > 0 && (
                    <button
                      onClick={() => setShowConfirmSubmit(true)}
                      disabled={isExamLocked || submitting}
                      className="px-10 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
                      <span className="text-xs font-bold uppercase tracking-widest text-white/70 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> Live Feed
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium bg-red-500/10 text-red-400 px-2 py-1 rounded-lg border border-red-500/20">
                      Strikes: {violationCount}/10
                    </div>
                  </div>

                  <div className="aspect-video relative">
                    <ProctorCanvas
                      enabled={!terminated && !timeExpired}
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
                  onClick={() => submitExam(false)}
                  disabled={submitting || timeExpired}
                  className="px-6 py-3 rounded-2xl bg-[#0091ad] hover:bg-[#007a91] text-white font-bold transition-all shadow-lg shadow-[#0091ad]/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                      Saving...
                    </>
                  ) : (
                    'Yes, Submit'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
