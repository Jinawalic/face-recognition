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
  ShieldAlert,
  Menu,
  X,
  Eye,
  Trash2,
  Edit3,
  BookOpen,
  AlertCircle
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

type TabType = 'dashboard' | 'add_student' | 'view_students' | 'upload_exam' | 'results'

export default function AdminDashboard({ apiBaseUrl, auth, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Student Detail Modal State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    surname: '',
    firstName: '',
    lastName: '',
    department: ''
  })

  // Toast State
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Student State
  const [studentForm, setStudentForm] = useState({
    matricNumber: '',
    surname: '',
    firstName: '',
    lastName: '',
    department: ''
  })
  const [students, setStudents] = useState<Student[]>([])
  const [studentPage, setStudentPage] = useState(1)
  const [resultPage, setResultPage] = useState(1)
  const itemsPerPage = 8

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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const refreshStudents = useCallback(async () => {
    setLoading(true)
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
      showToast('Student enrolled successfully')
      setStudentForm({ matricNumber: '', surname: '', firstName: '', lastName: '', department: '' })
      refreshStudents()
    } catch (e: any) {
      setError(e?.message || 'Failed to add student')
    }
  }

  const handleDelete = async (matric: string) => {
    if (!confirm(`Are you sure you want to delete student ${matric}? This action is permanent.`)) return
    try {
      const res = await fetch(`${apiBaseUrl}/admin/students/${matric}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        showToast('Student deleted successfully')
        refreshStudents()
        if (selectedStudent?.matric_number === matric) setSelectedStudent(null)
      } else {
        showToast('Delete failed', 'error')
      }
    } catch {
      showToast('Delete failed', 'error')
    }
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return
    try {
      const res = await fetch(`${apiBaseUrl}/admin/students/update/${selectedStudent.matric_number}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        showToast('Profile updated')
        setIsEditMode(false)
        refreshStudents()
        // Update local selected student
        const data = await res.json()
        setSelectedStudent({ ...selectedStudent, ...editForm })
      } else {
        showToast('Update failed', 'error')
      }
    } catch {
      showToast('Update failed', 'error')
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
          showToast(`Uploaded ${data.inserted} students`)
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
      showToast('Question saved')
      setQuestionForm({ text: '', options: ['', '', '', ''], correctIndex: 0 })
    } catch {
      setError('Failed to add question')
    }
  }

  const onBanToggle = async (matricNumber: string, nextBanned: boolean) => {
    try {
      await apiPost(`${apiBaseUrl}/admin/students/set-banned`, { matricNumber, is_banned: nextBanned }, { token })
      refreshStudents()
      showToast(nextBanned ? 'Student suspended' : 'Student restored')
      // Update modal if open
      if (selectedStudent?.matric_number === matricNumber) {
        setSelectedStudent({ ...selectedStudent, is_banned: nextBanned })
      }
    } catch {
      showToast('Failed to update status', 'error')
    }
  }

  const downloadResultsCSV = () => {
    const rows: string[][] = [['Student Name', 'Matric Number', 'Department', 'Course/Exam', 'Score', 'Violations']]
    students.forEach(s => {
      const name = `${s.surname || ''} ${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unspecified'
      const violations = s.violations.length === 0 ? 'Good' : s.violations.map(v => v.type).join(' | ')
      if (s.results.length === 0) {
        rows.push([name, s.matric_number, s.department || 'General', 'No exams taken', '-', violations])
      } else {
        s.results.forEach(r => rows.push([name, s.matric_number, s.department || 'General', r.exam_title, `${r.score}/${r.total}`, violations]))
      }
    })
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `results_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalExamsTaken = students.reduce((acc, s) => acc + s.results.length, 0)
    return [
      { label: 'Total Students', value: students.length, icon: Users, color: 'bg-blue-500' },
      { label: 'Courses/Exams', value: exams.length, icon: BookOpen, color: 'bg-purple-500' },
      { label: 'Banned Students', value: students.filter(s => s.is_banned).length, icon: ShieldBan, color: 'bg-red-500' },
      { label: 'Total Results', value: totalExamsTaken, icon: BarChart3, color: 'bg-emerald-500' },
    ]
  }, [students, exams])

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * itemsPerPage
    return students.slice(start, start + itemsPerPage)
  }, [students, studentPage])

  const flattenedResults = useMemo(() => {
    const res: any[] = []
    students.forEach(s => {
      const name = `${s.surname || ''} ${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unspecified'
      if (s.results.length === 0) {
        res.push({ student: s, name, exam_title: 'No exam taken', score: '-', total: '-', violations: s.violations })
      } else {
        s.results.forEach(r => res.push({ student: s, name, ...r, violations: s.violations }))
      }
    })
    return res
  }, [students])

  const paginatedResults = useMemo(() => {
    const start = (resultPage - 1) * itemsPerPage
    return flattenedResults.slice(start, start + itemsPerPage)
  }, [flattenedResults, resultPage])

  const studentTotalPages = Math.ceil(students.length / itemsPerPage)
  const resultTotalPages = Math.ceil(flattenedResults.length / itemsPerPage)

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'add_student', label: 'Add Students', icon: UserPlus },
    { key: 'view_students', label: 'View Registered', icon: Users },
    { key: 'upload_exam', label: 'Configure Exams', icon: FileText },
    { key: 'results', label: 'Results', icon: BarChart3 },
  ] as const

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden relative">
      {/* Toast Notification */}
      {toast && (
        <div className={['fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-slide-in', toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'].join(' ')}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-bold">{toast.msg}</span>
        </div>
      )}

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0F0F0F] border-b border-white/10 z-[100] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#44A194] rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="font-black text-white tracking-widest text-xs">PROCTORLY</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-white/60 hover:text-white transition-all">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={[
        'fixed lg:relative inset-y-0 left-0 z-[150] w-72 border-r border-white/10 bg-[#0F0F0F] flex flex-col shadow-2xl transition-transform duration-300 transform lg:translate-x-0',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ].join(' ')}>
        <div className="p-8 border-b border-white/10 hidden lg:block">
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

        <nav className="flex-1 p-6 space-y-2 mt-16 lg:mt-0">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setIsSidebarOpen(false); setError(''); setOkMsg('') }}
              className={['flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all font-bold text-sm',
                activeTab === key ? 'bg-[#44A194] text-white shadow-xl shadow-[#44A194]/20' : 'hover:bg-white/5 text-white/40'
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
      <div className="flex-1 overflow-y-auto bg-[#0A0A0A] p-6 lg:p-12 pt-24 lg:pt-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 lg:mb-12">
            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight capitalize">{activeTab.replace('_', ' ')}</h1>
            <p className="text-white/40 mt-2 font-medium">Manage your examination environment and student records.</p>
          </div>

          {(error || okMsg) && (
             <div className="mb-8 space-y-3">
               {error && (
                 <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-200 flex items-center gap-3 animate-fade-in">
                   <AlertTriangle className="w-4 h-4 text-red-400" /> {error}
                 </div>
               )}
               {okMsg && (
                 <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-sm text-emerald-200 flex items-center gap-3 animate-fade-in">
                   <Check className="w-4 h-4 text-emerald-400" /> {okMsg}
                 </div>
               )}
             </div>
          )}

          {/* ── Dashboard Stats ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-12 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, i) => (
                  <div key={i} className="p-8 rounded-3xl border border-white/10 bg-white/5 shadow-2xl relative overflow-hidden group hover:border-[#44A194]/40 transition-all">
                    <div className={['absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-10 group-hover:opacity-20 transition-all rounded-full', s.color].join(' ')} />
                    <div className="relative z-10">
                      <div className={['w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6', s.color].join(' ')}>
                        <s.icon className="w-6 h-6" />
                      </div>
                      <div className="text-3xl font-black text-white mb-1">{s.value}</div>
                      <div className="text-xs font-black uppercase tracking-widest text-white/30">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Activity Mini-Table */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-[#44A194]" /> Recent Registrations
                  </h2>
                  <button onClick={() => setActiveTab('view_students')} className="text-xs font-black uppercase tracking-widest text-[#44A194] hover:text-white transition-all">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-white/5">
                      {students.slice(0, 5).map(s => (
                        <tr key={s.matric_number}>
                          <td className="py-4 font-black text-sm text-[#44A194]">{s.matric_number}</td>
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
          )}

          {/* ── Add Students ── */}
          {activeTab === 'add_student' && (
            <div className="grid grid-cols-1 gap-8 animate-fade-in">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:p-10 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#44A194] rounded-full" />
                  <h2 className="text-2xl font-bold">Manual Enrollment</h2>
                </div>
                <form onSubmit={onAddSingle} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Matric Number</label>
                    <input required value={studentForm.matricNumber} onChange={e => setStudentForm({ ...studentForm, matricNumber: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] focus:ring-4 focus:ring-[#44A194]/10 transition-all font-bold" placeholder="CSC/21/042" />
                  </div>
                  <div className="space-y-2"><label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Surname</label>
                  <input value={studentForm.surname} onChange={e => setStudentForm({ ...studentForm, surname: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] transition-all" /></div>
                  <div className="space-y-2"><label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">First Name</label>
                  <input value={studentForm.firstName} onChange={e => setStudentForm({ ...studentForm, firstName: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] transition-all" /></div>
                  <div className="space-y-2"><label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Last Name</label>
                  <input value={studentForm.lastName} onChange={e => setStudentForm({ ...studentForm, lastName: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] transition-all" /></div>
                  <div className="space-y-2"><label className="text-xs font-black text-white/30 uppercase tracking-widest pl-1">Department</label>
                  <input value={studentForm.department} onChange={e => setStudentForm({ ...studentForm, department: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#44A194] transition-all" /></div>
                  <button className="sm:col-span-2 mt-6 bg-[#44A194] hover:bg-[#3B8F83] py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-[#44A194]/20 flex items-center justify-center gap-3">
                    <UserPlus className="w-5 h-5" /> Enroll Student
                  </button>
                </form>
              </div>
              <div className="rounded-3xl border-2 border-dashed border-white/10 bg-white/2 p-12 text-center group hover:bg-white/5 transition-all">
                <Upload className="w-12 h-12 text-[#44A194] mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-3 tracking-tight">Batch Enrollment</h2>
                <input type="file" accept=".csv" onChange={onFileUpload} className="hidden" id="csvUpload" />
                <label htmlFor="csvUpload" className="inline-block px-12 py-4 bg-[#44A194] hover:bg-[#3B8F83] rounded-2xl cursor-pointer transition-all border border-white/5 font-black uppercase tracking-widest text-sm shadow-xl shadow-[#44A194]/20">Upload CSV File</label>
              </div>
            </div>
          )}

          {/* ── View Students ── */}
          {activeTab === 'view_students' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10 gap-4">
                <div className="font-bold text-lg">{students.length} Registered Students</div>
                <button onClick={refreshStudents} className="w-full sm:w-auto text-xs uppercase font-black tracking-widest text-[#44A194] bg-[#44A194]/10 px-6 py-3 rounded-xl border border-[#44A194]/10 flex items-center justify-center gap-2">
                  <RefreshCw className={loading ? 'animate-spin' : ''} /> Sync Data
                </button>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/3 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 uppercase text-[10px] font-black text-white/30 tracking-[.2em]">
                        <th className="p-6">Matric</th>
                        <th className="p-6">Name</th>
                        <th className="p-6">Dept</th>
                        <th className="p-6 text-center">Status</th>
                        <th className="p-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedStudents.map(s => (
                        <tr key={s.matric_number} className="hover:bg-white/5 transition-colors">
                          <td className="p-6 font-black text-sm text-[#44A194]">{s.matric_number}</td>
                          <td className="p-6 text-sm font-semibold">{s.surname} {s.first_name}</td>
                          <td className="p-6 text-sm text-white/40">{s.department || 'General'}</td>
                          <td className="p-6 text-center">
                             {s.is_banned 
                               ? <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded-lg text-[9px] font-black">BANNED</span>
                               : <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-[9px] font-black">ACTIVE</span>
                             }
                          </td>
                          <td className="p-6 text-right space-x-2">
                            <button onClick={() => { setSelectedStudent(s); setIsEditMode(false); setEditForm({ surname: s.surname, firstName: s.first_name, lastName: s.last_name, department: s.department }) }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(s.matric_number)} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {studentTotalPages > 1 && (
                  <div className="p-6 border-t border-white/10 flex items-center justify-center gap-4 bg-white/5">
                    <button disabled={studentPage === 1} onClick={() => setStudentPage(p => p - 1)} className="p-2 rounded-lg bg-black/20 hover:bg-[#44A194] disabled:opacity-30"><ChevronLeft /></button>
                    <span className="text-xs font-black">PAGE {studentPage} / {studentTotalPages}</span>
                    <button disabled={studentPage === studentTotalPages} onClick={() => setStudentPage(p => p + 1)} className="p-2 rounded-lg bg-black/20 hover:bg-[#44A194] disabled:opacity-30"><ChevronRight /></button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Configure Exams ── */}
          {activeTab === 'upload_exam' && (
            <div className="space-y-8 animate-fade-in">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:p-12 shadow-2xl backdrop-blur-xl">
                 <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-4">
                   <h2 className="text-2xl font-bold flex items-center gap-3"><BookOpen className="w-6 h-6 text-[#44A194]" /> Exam Setup</h2>
                   <button onClick={() => { setIsCreatingNewExam(!isCreatingNewExam); setSelectedExamId('') }} className="w-full sm:w-auto px-6 py-3 bg-[#44A194] hover:bg-[#3B8F83] rounded-xl font-black uppercase text-[10px] tracking-widest">{isCreatingNewExam ? 'Cancel' : 'Create New Exam'}</button>
                 </div>
                 {isCreatingNewExam ? (
                    <form onSubmit={onAddExam} className="space-y-6">
                       <input required value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} placeholder="Exam Title" className="w-full p-5 rounded-2xl bg-black/40 border border-white/10 outline-none focus:border-[#44A194]" />
                       <textarea value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} placeholder="Instructions/Description" className="w-full p-5 rounded-2xl bg-black/40 border border-white/10 min-h-[150px] outline-none" />
                       <button className="w-full py-5 bg-[#44A194] rounded-2xl font-black uppercase text-sm">Create Instance</button>
                    </form>
                 ) : (
                    <div className="space-y-10">
                       <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="w-full p-5 rounded-2xl bg-black/40 border border-white/10 font-bold outline-none">
                          <option value="">Select Exam to Add Questions</option>
                          {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                       </select>
                       {selectedExamId && (
                         <form onSubmit={onAddQuestion} className="space-y-8 border-t border-white/5 pt-10">
                            <textarea required value={questionForm.text} onChange={e => setQuestionForm({ ...questionForm, text: e.target.value })} placeholder="Question Text" className="w-full p-5 rounded-2xl bg-black/40 border border-white/10 min-h-[150px]" />
                            <div className="grid grid-cols-1 gap-4">
                               {questionForm.options.map((opt, idx) => (
                                 <div key={idx} className="flex gap-4">
                                    <input required value={opt} onChange={e => { const n = [...questionForm.options]; n[idx] = e.target.value; setQuestionForm({ ...questionForm, options: n }) }} placeholder={`Option ${String.fromCharCode(65 + idx)}`} className="flex-1 p-5 rounded-2xl bg-black/40 border border-white/10" />
                                    <button type="button" onClick={() => setQuestionForm({ ...questionForm, correctIndex: idx })} className={['px-6 rounded-2xl border font-black text-[10px] uppercase', questionForm.correctIndex === idx ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/10 text-white/30'].join(' ')}>{questionForm.correctIndex === idx ? 'Correct' : 'Mark'}</button>
                                 </div>
                               ))}
                            </div>
                            <button className="w-full py-5 bg-[#44A194] rounded-2xl font-black uppercase tracking-widest text-sm">Save Question</button>
                         </form>
                       )}
                    </div>
                 )}
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {activeTab === 'results' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10 gap-4">
                <div className="text-center sm:text-left"><h2 className="text-xl font-bold">Examination Database</h2><p className="text-xs text-white/30">Detailed student scores and violation records</p></div>
                <button onClick={downloadResultsCSV} className="w-full sm:w-auto px-6 py-3 bg-[#44A194] rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download Records</button>
              </div>
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/3">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead><tr className="bg-white/5 uppercase text-[10px] font-black text-white/30 tracking-widest"><th className="p-5">Student</th><th className="p-5">Matric</th><th className="p-5">Exam</th><th className="p-5 text-center">Score</th><th className="p-5">Violations</th></tr></thead>
                       <tbody className="divide-y divide-white/5">
                          {paginatedResults.map((r, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-all">
                               <td className="p-5 text-sm font-bold text-white/80">{r.name}</td>
                               <td className="p-5 text-sm font-black text-[#44A194]">{r.student.matric_number}</td>
                               <td className="p-5 text-sm">{r.exam_title}</td>
                               <td className="p-5 text-center font-black">{r.score === '-' ? '-' : `${r.score}/${r.total}`}</td>
                               <td className="p-5">
                                  {r.violations.length === 0 
                                     ? <span className="text-emerald-400 text-[10px] font-black tracking-widest">GOOD</span>
                                     : <span className="text-red-400 text-[10px] font-black tracking-widest">{r.violations.length} LOGGED</span>
                                  }
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 {resultTotalPages > 1 && (
                    <div className="p-6 bg-white/5 flex items-center justify-center gap-4">
                       <button disabled={resultPage === 1} onClick={() => setResultPage(p => p - 1)} className="p-2 rounded-lg bg-black/20 hover:bg-[#44A194] disabled:opacity-30"><ChevronLeft /></button>
                       <span className="text-xs font-black uppercase">PAGE {resultPage} / {resultTotalPages}</span>
                       <button disabled={resultPage === resultTotalPages} onClick={() => setResultPage(p => p + 1)} className="p-2 rounded-lg bg-black/20 hover:bg-[#44A194] disabled:opacity-30"><ChevronRight /></button>
                    </div>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Student Detail Modal ── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-[#121212] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative">
            <button onClick={() => setSelectedStudent(null)} className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all"><X /></button>
            <div className="p-12">
               <div className="flex items-center gap-6 mb-10">
                  <div className="w-20 h-20 rounded-3xl bg-[#44A194]/10 flex items-center justify-center text-[#44A194] border border-[#44A194]/20">
                     <Users className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">{selectedStudent.surname}, {selectedStudent.first_name}</h2>
                    <p className="text-[#44A194] font-black uppercase text-sm tracking-widest mt-1">{selectedStudent.matric_number}</p>
                  </div>
               </div>

               {isEditMode ? (
                 <form onSubmit={handleUpdate} className="grid grid-cols-2 gap-6 animate-fade-in">
                    <div className="space-y-1"><label className="text-[10px] uppercase font-black text-white/30 ml-1">Surname</label>
                    <input value={editForm.surname} onChange={e => setEditForm({...editForm, surname: e.target.value})} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#44A194]" /></div>
                    <div className="space-y-1"><label className="text-[10px] uppercase font-black text-white/30 ml-1">First Name</label>
                    <input value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#44A194]" /></div>
                    <div className="space-y-1"><label className="text-[10px] uppercase font-black text-white/30 ml-1">Department</label>
                    <input value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#44A194]" /></div>
                    <div className="col-span-2 flex gap-4 mt-4">
                       <button type="submit" className="flex-1 py-4 bg-[#44A194] text-white rounded-2xl font-black uppercase tracking-widest">Save Changes</button>
                       <button type="button" onClick={() => setIsEditMode(false)} className="px-10 py-4 bg-white/5 rounded-2xl font-black uppercase tracking-widest border border-white/10">Cancel</button>
                    </div>
                 </form>
               ) : (
                 <div className="space-y-10 animate-fade-in">
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-1"><div className="text-[10px] uppercase font-black text-white/30">Department</div><div className="font-bold text-lg">{selectedStudent.department || 'General'}</div></div>
                       <div className="space-y-1"><div className="text-[10px] uppercase font-black text-white/30">Status</div><div className={['font-bold text-lg', selectedStudent.is_banned ? 'text-red-400' : 'text-emerald-400'].join(' ')}>{selectedStudent.is_banned ? 'Suspended' : 'Verified'}</div></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                       <button onClick={() => onBanToggle(selectedStudent.matric_number, !selectedStudent.is_banned)} className={['flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border flex items-center justify-center gap-2', selectedStudent.is_banned ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'].join(' ')}>
                          {selectedStudent.is_banned ? <><ShieldCheck className="w-4 h-4" /> Restore Student</> : <><ShieldBan className="w-4 h-4" /> Suspend Student</>}
                       </button>
                       <button onClick={() => setIsEditMode(true)} className="py-4 rounded-2xl bg-white/5 border border-white/10 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                          <Edit3 className="w-4 h-4" /> Update Profile
                       </button>
                       <button onClick={() => { if(confirm('Delete permanently?')) handleDelete(selectedStudent.matric_number) }} className="py-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                          <Trash2 className="w-4 h-4" /> Delete Student
                       </button>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
