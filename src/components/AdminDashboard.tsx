'use client'
import { useEffect, useMemo, useState, FormEvent, ChangeEvent, useCallback } from 'react'
import { apiPost } from '@/lib/api'
import { AuthState } from '@/lib/storage'
import {
  Users,
  UserPlus,
  FileText,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Upload,
  RefreshCw,
  Check,
  AlertTriangle,
  ShieldBan,
  GraduationCap,
  LayoutDashboard,
  BarChart3,
  Download,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react'

interface Violation {
  type: string;
  message: string;
  timestamp: string;
}

interface StudentResult {
  exam_title: string;
  score: number;
  total: number;
  createdAt: string;
}

interface Student {
  matric_number: string;
  surname: string;
  first_name: string;
  last_name: string;
  department: string;
  is_banned: boolean;
  violation_count: number;
  violations: Violation[];
  results: StudentResult[];
}

interface Exam {
  id: string;
  title: string;
  description: string;
}

interface AdminDashboardProps {
  apiBaseUrl: string;
  auth: AuthState;
  onLogout: () => void;
}

export default function AdminDashboard({ apiBaseUrl, auth, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'add_student' | 'view_students' | 'upload_exam' | 'results'>('add_student')
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Student State
  const [studentForm, setStudentForm] = useState({
    matricNumber: '',
    surname: '',
    firstName: '',
    lastName: '',
    department: ''
  })
  const [students, setStudents] = useState<Student[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const studentsPerPage = 10

  // Exam/Question State
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [isCreatingNewExam, setIsCreatingNewExam] = useState(false)
  const [examForm, setExamForm] = useState({ title: '', description: '' })
  const [questionForm, setQuestionForm] = useState({
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0
  })

  const token = auth?.token
  const adminName = auth?.user?.username || 'admin'

  const refreshStudents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBaseUrl}/admin/students/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = await res.json()
      setStudents(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, token])

  const refreshExams = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/exams/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setExams(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load exams', e)
    }
  }, [apiBaseUrl, token])

  useEffect(() => {
    refreshStudents()
    refreshExams()
  }, [refreshStudents, refreshExams])

  const onAddSingle = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setOkMsg('')
    if (!studentForm.matricNumber) return
    try {
      await apiPost(`${apiBaseUrl}/admin/students`, studentForm, { token })
      setOkMsg(`Added student: ${studentForm.matricNumber.toUpperCase()}`)
      setStudentForm({ matricNumber: '', surname: '', firstName: '', lastName: '', department: '' })
      refreshStudents()
    } catch (e: any) {
      setError(e?.message || 'Failed to add student')
    }
  }

  const onFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setOkMsg('')
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) { setError('CSV file is empty or missing content.'); return }
        const header = lines[0]
        let delimiter = ','
        if (header.includes(';')) delimiter = ';'
        else if (header.includes('\t')) delimiter = '\t'
        const studentsToUpload = lines.slice(1).map(line => {
          const parts = line.split(delimiter)
          return {
            matricNumber: String(parts[0] || '').trim(),
            surname: String(parts[1] || '').trim(),
            firstName: String(parts[2] || '').trim(),
            lastName: String(parts[3] || '').trim(),
            department: String(parts[4] || '').trim()
          }
        }).filter(s => s.matricNumber && s.matricNumber.length >= 3)
        if (studentsToUpload.length === 0) { setError('No valid students found in CSV.'); return }
        setOkMsg(`Sending ${studentsToUpload.length} students...`)
        const data = await apiPost<{ inserted: number; skipped: number }>(`${apiBaseUrl}/admin/students/bulk`, { students: studentsToUpload }, { token })
        if (data.inserted === 0 && data.skipped > 0) {
          setError(`All ${data.skipped} entries already exist or are invalid.`)
        } else {
          setOkMsg(`Bulk upload complete! ${data?.inserted} added, ${data?.skipped} skipped.`)
        }
        refreshStudents()
      } catch (err: any) {
        setError(err.message || 'Bulk upload failed')
      }
    }
    reader.readAsText(file)
  }

  const onAddExam = async (e: FormEvent) => {
    e.preventDefault()
    if (!examForm.title) return
    setError('')
    setOkMsg('')
    try {
      const data = await apiPost<{ id: string }>(`${apiBaseUrl}/admin/exams/create`, {
        title: examForm.title,
        description: examForm.description
      }, { token })
      setOkMsg('Exam created! Now add questions.')
      setSelectedExamId(data.id)
      setIsCreatingNewExam(false)
      refreshExams()
    } catch (e: any) {
      setError(e.message || 'Failed to create exam')
    }
  }

  const onAddQuestion = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedExamId || !questionForm.text) return
    setError('')
    setOkMsg('')
    try {
      await apiPost(`${apiBaseUrl}/admin/exams/questions`, {
        exam_id: selectedExamId,
        question_text: questionForm.text,
        options: questionForm.options,
        correct_answer: questionForm.options[questionForm.correctIndex]
      }, { token })
      setOkMsg('Question added successfully')
      setQuestionForm({ text: '', options: ['', '', '', ''], correctIndex: 0 })
    } catch {
      setError('Failed to add question')
    }
  }

  const onBanToggle = async (matricNumber: string, nextBanned: boolean) => {
    try {
      await apiPost(`${apiBaseUrl}/admin/students/set-banned`, { matricNumber, is_banned: nextBanned }, { token })
      refreshStudents()
    } catch {
      setError('Update failed')
    }
  }

  // Results download handler
  const downloadResultsCSV = () => {
    const rows: string[][] = [
      ['Student Name', 'Matric Number', 'Department', 'Course/Exam', 'Score', 'Violations']
    ]

    students.forEach(s => {
      const name = `${s.surname || ''} ${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unspecified'
      const matric = s.matric_number
      const dept = s.department || 'General'

      if (s.results.length === 0) {
        const violations = s.violations.length === 0
          ? 'Good'
          : s.violations.map(v => v.type).join(' | ')
        rows.push([name, matric, dept, 'No exams taken', '-', violations])
      } else {
        s.results.forEach(r => {
          const violations = s.violations.length === 0
            ? 'Good'
            : s.violations.map(v => v.type).join(' | ')
          rows.push([name, matric, dept, r.exam_title, `${r.score}/${r.total}`, violations])
        })
      }
    })

    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exam_results_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * studentsPerPage
    return students.slice(start, start + studentsPerPage)
  }, [students, currentPage])

  const totalPages = Math.ceil(students.length / studentsPerPage)

  const navItems = [
    { key: 'add_student', label: 'Add Students', icon: UserPlus },
    { key: 'view_students', label: 'View Registered', icon: Users },
    { key: 'upload_exam', label: 'Configure Exams', icon: FileText },
    { key: 'results', label: 'Results', icon: BarChart3 },
  ] as const

  const tabTitles: Record<string, string> = {
    add_student: 'Add Students',
    view_students: 'View Students',
    upload_exam: 'Configure Exams',
    results: 'Student Results'
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-white/10 bg-[#0F0F0F] flex flex-col shadow-2xl relative z-20">
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#44A194] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#44A194]/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-black tracking-tighter text-white">PROCTOR<span className="text-[#44A194]">LY</span></div>
              <div className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-0.5">{adminName}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setError(''); setOkMsg('') }}
              className={['flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all font-bold text-sm',
                activeTab === key
                  ? 'bg-[#44A194] text-white shadow-xl shadow-[#44A194]/20'
                  : 'hover:bg-white/5 text-white/40'
              ].join(' ')}
            >
              <Icon className="w-5 h-5" /> {label}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <button onClick={onLogout} className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-red-400/60 font-bold hover:bg-red-500/10 hover:text-red-400 transition-all text-sm border border-transparent hover:border-red-500/20">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#0A0A0A] p-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-black text-white tracking-tight">{tabTitles[activeTab]}</h1>
            <p className="text-white/40 mt-2 font-medium">Manage your examination environment and student records.</p>
          </div>

          {error && (
            <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-200 flex items-center gap-3 animate-fade-in">
              <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              {error}
            </div>
          )}
          {okMsg && (
            <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-sm text-emerald-200 flex items-center gap-3 animate-fade-in">
              <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 shrink-0">
                <Check className="w-4 h-4" />
              </div>
              {okMsg}
            </div>
          )}

          {/* ── Add Students ── */}
          {activeTab === 'add_student' && (
            <div className="grid grid-cols-1 gap-8 animate-fade-in">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#44A194] rounded-full" />
                  <h2 className="text-2xl font-bold">Manual Enrollment</h2>
                </div>
                <form onSubmit={onAddSingle} className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Matric Number</label>
                    <input required value={studentForm.matricNumber} onChange={e => setStudentForm({ ...studentForm, matricNumber: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] focus:ring-4 focus:ring-[#44A194]/10 transition-all font-bold" placeholder="CSC/21/042" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Surname</label>
                    <input value={studentForm.surname} onChange={e => setStudentForm({ ...studentForm, surname: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">First Name</label>
                    <input value={studentForm.firstName} onChange={e => setStudentForm({ ...studentForm, firstName: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Last Name</label>
                    <input value={studentForm.lastName} onChange={e => setStudentForm({ ...studentForm, lastName: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Department</label>
                    <input value={studentForm.department} onChange={e => setStudentForm({ ...studentForm, department: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] transition-all" />
                  </div>
                  <button className="col-span-2 mt-6 bg-[#44A194] hover:bg-[#3B8F83] py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-[#44A194]/20 active:scale-[0.98] flex items-center justify-center gap-3">
                    <UserPlus className="w-5 h-5" /> Enroll Student
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border-2 border-dashed border-white/10 bg-white/2 p-12 text-center group hover:bg-white/5 transition-all">
                <div className="mx-auto w-20 h-20 bg-[#44A194]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#44A194]/20 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-[#44A194]" />
                </div>
                <h2 className="text-2xl font-bold mb-3 tracking-tight">Batch Enrollment</h2>
                <p className="text-white/40 text-sm mb-10 max-w-sm mx-auto font-medium">Register multiple students via CSV. Headers: <span className="text-white/60">matric, surname, first, last, dept.</span></p>
                <input type="file" accept=".csv" onChange={onFileUpload} className="hidden" id="csvUpload" />
                <label htmlFor="csvUpload" className="inline-block px-12 py-4 bg-[#44A194] hover:bg-[#3B8F83] rounded-2xl cursor-pointer transition-all border border-white/5 font-black uppercase tracking-widest text-sm shadow-xl shadow-[#44A194]/20 active:scale-[0.98]">
                  Upload CSV File
                </label>
              </div>
            </div>
          )}

          {/* ── View Students ── */}
          {activeTab === 'view_students' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="font-bold text-lg">{students.length} Total Registered</div>
                <button onClick={refreshStudents} className="text-xs uppercase font-black tracking-[0.2em] text-[#44A194] hover:text-white transition-all bg-[#44A194]/10 px-6 py-2.5 rounded-xl border border-[#44A194]/20 flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync Data
                </button>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/3 shadow-2xl backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="p-6 text-xs font-black text-white/30 uppercase tracking-widest">Matric Number</th>
                        <th className="p-6 text-xs font-black text-white/30 uppercase tracking-widest">Full Name</th>
                        <th className="p-6 text-xs font-black text-white/30 uppercase tracking-widest">Department</th>
                        <th className="p-6 text-xs font-black text-white/30 uppercase tracking-widest text-center">Status</th>
                        <th className="p-6 text-xs font-black text-white/30 uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedStudents.map(s => (
                        <tr key={s.matric_number} className="hover:bg-white/5 transition-colors group">
                          <td className="p-6 font-black text-sm text-[#44A194]">{s.matric_number.toUpperCase()}</td>
                          <td className="p-6 text-sm font-semibold text-white/80">{`${s.surname || ''} ${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unspecified'}</td>
                          <td className="p-6 text-sm text-white/40 font-medium">{s.department || 'General'}</td>
                          <td className="p-6 text-center">
                            {s.is_banned
                              ? <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit mx-auto"><ShieldAlert className="w-3 h-3" />SUSPENDED</span>
                              : <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit mx-auto"><ShieldCheck className="w-3 h-3" />VERIFIED</span>
                            }
                          </td>
                          <td className="p-6 text-right">
                            <button onClick={() => onBanToggle(s.matric_number, !s.is_banned)} className={['px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all', s.is_banned ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10' : 'border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10'].join(' ')}>
                              {s.is_banned ? 'Restore' : 'Suspend'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!students.length && !loading && (
                  <div className="p-20 text-center text-white/20 text-sm font-bold uppercase tracking-widest italic">Database Empty</div>
                )}
                {loading && (
                  <div className="p-20 text-center">
                    <RefreshCw className="animate-spin h-8 w-8 text-[#44A194] mx-auto" />
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-6 mt-12 bg-white/5 p-4 rounded-2xl border border-white/10 w-fit mx-auto">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-3 rounded-xl bg-black/20 border border-white/10 disabled:opacity-20 hover:bg-[#44A194] hover:text-white transition-all shadow-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-black uppercase tracking-widest text-[#44A194]">Page {currentPage} of {totalPages}</span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-3 rounded-xl bg-black/20 border border-white/10 disabled:opacity-20 hover:bg-[#44A194] hover:text-white transition-all shadow-lg">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Configure Exams ── */}
          {activeTab === 'upload_exam' && (
            <div className="space-y-12 animate-fade-in">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-12 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#44A194] rounded-full" />
                    <h2 className="text-2xl font-bold">Exam Configuration</h2>
                  </div>
                  <button onClick={() => { setIsCreatingNewExam(!isCreatingNewExam); setSelectedExamId(''); setExamForm({ title: '', description: '' }) }} className="text-[10px] font-black uppercase tracking-widest px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 flex items-center gap-2">
                    {isCreatingNewExam ? 'Dismiss' : <><UserPlus className="w-3.5 h-3.5" /> Initialise New Exam</>}
                  </button>
                </div>
                <div className="space-y-10">
                  {isCreatingNewExam ? (
                    <form onSubmit={onAddExam} className="space-y-6 animate-fade-in">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Examination Title</label>
                        <input required value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] font-bold" placeholder="e.g. CSC402: Mid-Semester Assessment" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Description (Internal)</label>
                        <textarea value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] min-h-[120px]" placeholder="Add meta details about the exam..." />
                      </div>
                      <button className="w-full bg-[#44A194] hover:bg-[#3B8F83] py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-[#44A194]/20 flex items-center justify-center gap-3">
                        <FileText className="w-5 h-5" /> Create Exam Instance
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Select Instance to Manage Questions</label>
                      <div className="relative">
                        <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] font-bold appearance-none cursor-pointer">
                          <option value="">-- Choose Existing Assessment --</option>
                          {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 pointer-events-none rotate-90" />
                      </div>
                    </div>
                  )}

                  {selectedExamId && (
                    <form onSubmit={onAddQuestion} className="space-y-8 pt-10 border-t border-white/5 animate-fade-in">
                      <div className="text-sm font-black text-[#44A194] uppercase tracking-widest">Instance UID: {selectedExamId}</div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Primary Question String</label>
                        <textarea required value={questionForm.text} onChange={e => setQuestionForm({ ...questionForm, text: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-5 outline-none focus:border-[#44A194] min-h-[150px] font-medium leading-relaxed" placeholder="Type the question exactly as it should appear..." />
                      </div>
                      <div className="space-y-6">
                        <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Options & Verification</label>
                        <div className="grid grid-cols-1 gap-4">
                          {questionForm.options.map((opt, idx) => (
                            <div key={idx} className="flex gap-4">
                              <div className="flex-1 relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase tracking-tighter">OPT {String.fromCharCode(65 + idx)}</div>
                                <input required value={opt} onChange={e => { const newOpts = [...questionForm.options]; newOpts[idx] = e.target.value; setQuestionForm({ ...questionForm, options: newOpts }) }} className="w-full rounded-2xl bg-black/40 border border-white/10 p-5 pl-12 outline-none focus:border-[#44A194] transition-all" placeholder="Type option here..." />
                              </div>
                              <button type="button" onClick={() => setQuestionForm({ ...questionForm, correctIndex: idx })} className={['px-8 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2', questionForm.correctIndex === idx ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20' : 'border-white/10 bg-white/5 text-white/20 hover:bg-white/10 hover:text-white'].join(' ')}>
                                {questionForm.correctIndex === idx ? <><Check className="w-4 h-4" /> Correct</> : 'Mark Correct'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button className="w-full bg-[#44A194] hover:bg-[#3B8F83] py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-2xl shadow-[#44A194]/20 active:scale-[0.98] mt-6 flex items-center justify-center gap-3">
                        <GraduationCap className="w-5 h-5" /> Commit Question to Repository
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {activeTab === 'results' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10">
                <div>
                  <div className="font-bold text-lg">{students.length} Students</div>
                  <div className="text-xs text-white/30 font-medium mt-0.5">Showing all exam results and violations</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={refreshStudents} className="text-xs uppercase font-black tracking-[0.2em] text-[#44A194] hover:text-white transition-all bg-[#44A194]/10 px-5 py-2.5 rounded-xl border border-[#44A194]/20 flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                  <button onClick={downloadResultsCSV} className="text-xs uppercase font-black tracking-[0.2em] text-white bg-[#44A194] hover:bg-[#3B8F83] px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#44A194]/20">
                    <Download className="w-4 h-4" /> Download CSV
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/3 shadow-2xl backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="p-5 text-xs font-black text-white/30 uppercase tracking-widest">Student</th>
                        <th className="p-5 text-xs font-black text-white/30 uppercase tracking-widest">Matric</th>
                        <th className="p-5 text-xs font-black text-white/30 uppercase tracking-widest">Dept.</th>
                        <th className="p-5 text-xs font-black text-white/30 uppercase tracking-widest">Course / Exam</th>
                        <th className="p-5 text-xs font-black text-white/30 uppercase tracking-widest text-center">Score</th>
                        <th className="p-5 text-xs font-black text-white/30 uppercase tracking-widest">Violations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {students.length === 0 && !loading && (
                        <tr>
                          <td colSpan={6} className="p-20 text-center text-white/20 text-sm font-bold uppercase tracking-widest italic">No records found</td>
                        </tr>
                      )}
                      {loading && (
                        <tr>
                          <td colSpan={6} className="p-20 text-center">
                            <RefreshCw className="animate-spin h-8 w-8 text-[#44A194] mx-auto" />
                          </td>
                        </tr>
                      )}
                      {students.map(s => {
                        const name = `${s.surname || ''} ${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unspecified'
                        const violationSummary = s.violations.length === 0
                          ? null
                          : s.violations

                        if (s.results.length === 0) {
                          return (
                            <tr key={s.matric_number} className="hover:bg-white/5 transition-colors">
                              <td className="p-5 text-sm font-bold text-white/80">{name}</td>
                              <td className="p-5 text-sm font-black text-[#44A194]">{s.matric_number}</td>
                              <td className="p-5 text-sm text-white/40">{s.department || 'General'}</td>
                              <td className="p-5 text-sm text-white/30 italic">No exam taken</td>
                              <td className="p-5 text-center"><span className="text-white/20 text-sm">—</span></td>
                              <td className="p-5">
                                {violationSummary === null
                                  ? <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">Good</span>
                                  : <div className="flex flex-col gap-1">{violationSummary.map((v, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold w-fit">{v.type}</span>
                                  ))}</div>
                                }
                              </td>
                            </tr>
                          )
                        }

                        return s.results.map((r, ri) => (
                          <tr key={`${s.matric_number}-${ri}`} className="hover:bg-white/5 transition-colors">
                            <td className="p-5 text-sm font-bold text-white/80">{ri === 0 ? name : ''}</td>
                            <td className="p-5 text-sm font-black text-[#44A194]">{ri === 0 ? s.matric_number : ''}</td>
                            <td className="p-5 text-sm text-white/40">{ri === 0 ? (s.department || 'General') : ''}</td>
                            <td className="p-5 text-sm text-white font-medium">{r.exam_title}</td>
                            <td className="p-5 text-center">
                              <span className={`text-sm font-black ${r.score / r.total >= 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>{r.score}<span className="text-white/30 font-medium">/{r.total}</span></span>
                            </td>
                            <td className="p-5">
                              {ri === 0 && (
                                violationSummary === null
                                  ? <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">Good</span>
                                  : <div className="flex flex-col gap-1">{violationSummary.map((v, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold w-fit">{v.type}</span>
                                  ))}</div>
                              )}
                            </td>
                          </tr>
                        ))
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
