'use client'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { apiPost } from '@/lib/api'
import {
  clearAuth,
  loadViolationCount,
  markBanned,
  saveViolationCount,
} from '@/lib/storage'
import { AuthState } from '@/lib/storage'
import { DetectionStatus } from '@/components/ProctorCanvas'
import DetectionStatusPanel from '@/components/DetectionStatusPanel'
import {
  LogOut,
  ChevronLeft,
  Camera,
  AlertTriangle,
  Check,
  ArrowLeft,
  FileText,
  Clock,
  ShieldAlert,
  Loader2,
  RefreshCw
} from 'lucide-react'

const ProctorCanvas = lazy(() => import('@/components/ProctorCanvas'))

interface Exam {
  id: string;
  title: string;
  description: string;
}

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctIndex: number;
}

interface ExamDashboardProps {
  apiBaseUrl: string;
  auth: AuthState;
  onLogout: () => void;
}

export default function ExamDashboard({ apiBaseUrl, auth, onLogout }: ExamDashboardProps) {
  const matricNumber = auth?.user?.matricNumber || auth?.user?.username || 'unknown'
  const fullName = [auth?.user?.surname, auth?.user?.firstName, auth?.user?.lastName]
    .filter(Boolean)
    .join(' ') || auth?.user?.username || matricNumber

  const [violationCount, setViolationCount] = useState(() => loadViolationCount(matricNumber))
  const [activeWarning, setActiveWarning] = useState('')
  const [terminated, setTerminated] = useState(false)
  const [started, setStarted] = useState(false)
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [examScore, setExamScore] = useState<{ score: number; total: number } | null>(null)

  // Detection Status State
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
    faceDetected: false,
    multipleFaces: false,
    phoneDetected: false,
    bookDetected: false,
    laptopDetected: false,
    tabletDetected: false
  })

  const violationCountRef = useRef(violationCount)

  useEffect(() => {
    violationCountRef.current = violationCount
    saveViolationCount(matricNumber, violationCount)
  }, [matricNumber, violationCount])

  useEffect(() => {
    async function fetchExams() {
      try {
        const response = await fetch(`${apiBaseUrl}/exam/list`, {
          headers: { 'Authorization': `Bearer ${auth?.token}` }
        })
        const data = await response.json()
        setExams(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to fetch exams', err)
      }
    }
    fetchExams()
  }, [apiBaseUrl, auth?.token])

  const startExam = async (examId: string) => {
    setSelectedExamId(examId)
    setLoadingQuestions(true)
    try {
      const response = await fetch(`${apiBaseUrl}/exam/questions/${examId}`, {
        headers: { 'Authorization': `Bearer ${auth?.token}` }
      })
      const data = await response.json()
      setQuestions(Array.isArray(data) ? data : [])
      setStarted(true)
    } catch {
      alert('Failed to load exam questions')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const submitExam = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`${apiBaseUrl}/exam/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth?.token}`
        },
        body: JSON.stringify({
          matricNumber,
          examId: selectedExamId,
          answers,
          questions
        })
      })
      const data = await res.json()
      if (data.score !== undefined) {
        setExamScore({ score: data.score, total: data.total })
      }
    } catch (e) {
      console.error('Failed to submit exam result', e)
    } finally {
      setSubmitting(false)
      setShowConfirmSubmit(false)
      setIsSubmitted(true)
      setStarted(false)
    }
  }

  const strikeLimit = 3

  const onStrike = async ({ type, message, meta }: any) => {
    setActiveWarning(message || 'Warning: Irregularity Detected!')
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
        { token: auth?.token },
      )
    } catch {
      // keep UI responsive even if backend is down
    }
  }

  const hardTerminate = async () => {
    const msg =
      'You have been logged out due to three consecutive irregularities. Contact your administrator.'
    markBanned(matricNumber, msg)

    try {
      await apiPost(
        `${apiBaseUrl}/proctor/report-violation`,
        {
          matricNumber,
          type: 'THREE_STRIKES_BAN',
          message: msg,
          meta: { violationCount: 3 },
          client_violation_count: 3,
          timestamp: new Date().toISOString(),
        },
        { token: auth?.token },
      )
    } catch {
      // ignore
    }

    clearAuth()
    setTerminated(true)
    onLogout()
  }

  useEffect(() => {
    if (violationCount >= strikeLimit && !terminated) {
      hardTerminate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violationCount, terminated])

  const statusPill = useMemo(() => {
    if (terminated) return { text: 'Session Terminated', cls: 'bg-red-500/15 text-red-200 border-red-500/30' }
    if (!started) return { text: 'Not Started', cls: 'bg-white/5 text-white/80 border-white/10' }
    return { text: 'Monitoring Active', cls: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' }
  }, [started, terminated])

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight text-white mt-1">Welcome, <span className="text-[#44A194]">{fullName}</span></div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={[
                'rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider',
                statusPill.cls,
              ].join(' ')}
            >
              {statusPill.text}
            </div>

            <button
              onClick={onLogout}
              className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 text-sm font-semibold transition-all backdrop-blur-sm flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 shadow-2xl shadow-red-500/5">
            <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase tracking-widest mb-3">
              <AlertTriangle className="w-4 h-4" />
              Critical Warning
            </div>
            <p className="text-sm text-red-200/60 leading-relaxed font-medium">
              Exceeding 3 irregularities will trigger an automatic <span className="text-red-400 font-bold">permanent suspension</span> of your session. Results will be invalidated.
            </p>
          </div>
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl min-h-[400px]">
            {started && !isSubmitted ? (
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Side: Exam Interface */}
                <div className="flex-1">
                  <div className="mb-8 flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Question {currentQuestionIndex + 1}</h2>
                      <p className="text-sm text-white/50 mt-1">Select the best answer from the options provided.</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                      <span className="text-xs font-bold text-[#44A194] uppercase tracking-widest">{currentQuestionIndex + 1} / {questions.length}</span>
                    </div>
                  </div>

                  {questions.length > 0 ? (
                    <div className="mb-2">
                      <p className="text-xl text-white font-medium leading-relaxed mb-8">{questions[currentQuestionIndex].questionText}</p>
                      <div className="grid grid-cols-1 gap-2">
                        {questions[currentQuestionIndex].options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => setAnswers({ ...answers, [currentQuestionIndex]: option })}
                            className={[
                              'w-full text-left p-2 rounded-2xl border-2 transition-all group relative overflow-hidden',
                              answers[currentQuestionIndex] === option
                                ? 'bg-[#44A194]/20 border-[#44A194] ring-4 ring-[#44A194]/10'
                                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                            ].join(' ')}
                          >
                            <div className="flex items-center gap-4 relative z-10">
                              <div className={[
                                'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border transition-all',
                                answers[currentQuestionIndex] === option
                                  ? 'bg-[#44A194] border-[#44A194] text-white'
                                  : 'bg-white/10 border-white/10 text-white/40'
                              ].join(' ')}>
                                {String.fromCharCode(65 + idx)}
                              </div>
                              <span className={[
                                'text-lg transition-all',
                                answers[currentQuestionIndex] === option ? 'text-white font-semibold' : 'text-white/70'
                              ].join(' ')}>{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <Loader2 className="animate-spin h-10 w-10 text-[#44A194] mx-auto mb-4" />
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
                        className="px-10 py-3 rounded-2xl bg-[#44A194] hover:bg-[#3B8F83] text-sm font-bold text-white shadow-lg shadow-[#44A194]/20 transition-all active:scale-95"
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

                {/* Right Side: Camera & Status */}
                <div className="lg:w-96">
                  <div className="sticky top-6 space-y-3">
                    <div className="bg-black/40 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-widest text-white/70 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Live Feed</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium bg-red-500/10 text-red-400 px-2 py-1 rounded-lg border border-red-500/20">
                          Strikes: {violationCount}/3
                        </div>
                      </div>

                      <div className="aspect-video relative">
                        <Suspense
                          fallback={
                            <div className="flex h-full items-center justify-center bg-black/60 p-6 text-sm text-white/70">
                              <div className="animate-pulse flex flex-col items-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin text-[#44A194]" />
                                <span className="font-bold uppercase tracking-widest text-[10px]">Initialising Sensors...</span>
                              </div>
                            </div>
                          }
                        >
                          <ProctorCanvas
                            enabled={started && !terminated}
                            apiBaseUrl={apiBaseUrl}
                            matricNumber={matricNumber}
                            authToken={auth?.token}
                            violationCount={violationCount}
                            onStrike={onStrike}
                            onWarning={(msg) => setActiveWarning(msg)}
                            onStatusUpdate={setDetectionStatus}
                          />
                        </Suspense>
                      </div>
                    </div>

                    {activeWarning && (
                      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 animate-fade-in flex gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="font-semibold">{activeWarning}</span>
                      </div>
                    )}

                    {/* Detection Status Panel */}
                    <DetectionStatusPanel status={detectionStatus} />
                  </div>
                </div>
              </div>
            ) : isSubmitted ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-3xl border border-emerald-500/20 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/5">
                  <Check className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-extrabold mb-4 text-white tracking-tight">Exam Submitted Successfully!</h2>
                {examScore && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 w-full max-w-sm mx-auto">
                    <div className="text-sm font-black uppercase tracking-widest text-[#44A194] mb-2">Final Result</div>
                    <div className="text-5xl font-black text-white">{examScore.score} <span className="text-white/30 text-2xl">/ {examScore.total}</span></div>
                    <div className="text-xs text-white/40 mt-3 font-medium uppercase tracking-tighter">Your score has been updated in the admin portal</div>
                  </div>
                )}
                <p className="text-white/50 mb-10 max-w-md mx-auto text-lg leading-relaxed">Your performance and proctoring data have been securely uploaded. You may now exit the application.</p>
                <button
                  onClick={onLogout}
                  className="px-10 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold transition-all active:scale-95 flex items-center gap-3"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Return to Portal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <div className="mb-10">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-bold text-white tracking-tight">Select Available Exam</h3>
                      <button className="text-xs font-bold uppercase tracking-widest text-[#44A194] hover:text-white transition-all flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh List
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {exams.length > 0 ? (
                        exams.map(exam => (
                          <div key={exam.id} className="p-8 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#44A194]/40 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all rotate-12">
                              <FileText className="w-20 h-20" />
                            </div>
                            <div className="relative z-10">
                              <h4 className="text-xl font-extrabold text-[#44A194] mb-3">{exam.title}</h4>
                              <p className="text-sm text-white/50 mb-8 line-clamp-3 leading-relaxed">{exam.description || 'Comprehensive assessment for the current module.'}</p>
                              <button
                                disabled={loadingQuestions}
                                onClick={() => startExam(exam.id)}
                                className="w-full py-4 rounded-2xl bg-[#44A194] hover:bg-[#3B8F83] text-white font-bold shadow-lg shadow-[#44A194]/20 transition-all active:scale-95' disabled:opacity-50"
                              >
                                {loadingQuestions && selectedExamId === exam.id ? 'Loading...' : 'Launch Exam Environment'}
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
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#44A194] mb-6">Examination Rules</h4>
                    <div className="space-y-2">
                      {[
                        'Maintain constant eye contact with the display.',
                        'Ensure your environment remains quiet and isolated.',
                        'Avoid unauthorized materials or electronic devices.',
                        'Maintain consistent center-face alignment.'
                      ].map((rule, i) => (
                        <div key={i} className="rounded-2xl border border-white/5 bg-white/2 p-3 flex gap-1 hover:bg-white/5 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-[#44A194]/10 text-[#44A194] flex items-center justify-center font-black text-sm shrink-0">
                            0{i + 1}
                          </div>
                          <span className="text-sm text-white/70 font-medium leading-normal">{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>

        {/* Confirmation Modal */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-3xl p-10 shadow-2xl transform scale-in-center overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#44A194] to-transparent" />
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
                  className="px-6 py-3 rounded-2xl bg-[#44A194] hover:bg-[#3B8F83] text-white font-bold transition-all shadow-lg shadow-[#44A194]/20 active:scale-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Saving...</> : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
