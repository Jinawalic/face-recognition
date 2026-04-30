'use client'
import { useState, useMemo } from 'react'
import { Download, ChevronLeft, ChevronRight, X, ShieldCheck, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAdminData } from '@/hooks/useAdminData'
import { apiPost } from '@/lib/api'

export default function Results() {
  const { students, exams, refreshStudents, apiBaseUrl, token } = useAdminData()
  const [resultPage, setResultPage] = useState(1)
  const [selectedStudentForViolations, setSelectedStudentForViolations] = useState<any | null>(null)
  const [selectedExam, setSelectedExam] = useState<string>('')
  const itemsPerPage = 8

  const uniqueExams = useMemo(() => {
    const titles = new Set<string>()
    exams.forEach(e => titles.add(e.title))
    return Array.from(titles).sort()
  }, [exams])

  const flattenedResults = useMemo(() => {
    if (!selectedExam) return [] // Require selection
    const res: any[] = []
    students.forEach(s => {
      const name = `${s.surname || ''} ${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unspecified'
      s.results.forEach(r => {
        if (selectedExam === r.exam_title) {
          res.push({ student: s, name, ...r, violations: s.violations })
        }
      })
    })
    return res
  }, [students, selectedExam])

  const paginatedResults = useMemo(() => {
    const start = (resultPage - 1) * itemsPerPage
    return flattenedResults.slice(start, start + itemsPerPage)
  }, [flattenedResults, resultPage])

  const resultTotalPages = Math.ceil(flattenedResults.length / itemsPerPage) || 1

  const downloadResultsCSV = () => {
    const rows: string[][] = [['Student Name', 'Matric Number', 'Department', 'Course/Exam', 'Score']]

    flattenedResults.forEach(r => {
      rows.push([
        r.name,
        r.student.matric_number,
        r.student.department || 'General',
        r.exam_title,
        r.score === '-' ? '-' : `${r.score}/${r.total}`
      ])
    })

    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const fileName = !selectedExam ? 'results' : selectedExam.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const a = document.createElement('a'); a.href = url; a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const restoreStudent = async (matricNumber: string) => {
    const restorePromise = async () => {
      await apiPost(`${apiBaseUrl}/admin/students/set-banned`, { matricNumber, is_banned: false }, { token })
      refreshStudents()
      setSelectedStudentForViolations((prev: any) => prev ? { 
        ...prev, 
        student: { ...prev.student, is_banned: false },
        violations: [] 
      } : null)
    }

    toast.promise(restorePromise(), {
      loading: 'Restoring student...',
      success: 'Student restored and violations cleared',
      error: 'Failed to restore student'
    })
  }

  return (
    <>
      <div className="mb-10 lg:mb-12">
        <h1 className="text-xl lg:text-2xl font-bold text-white capitalize">Results</h1>
        <p className="text-white/40 mt-2 font-medium">Review student performance and examination logs.</p>
      </div>

      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10 gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold">Examination Database</h2>
            <p className="text-xs text-white/30">Detailed student scores and violation records</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <select
              value={selectedExam}
              onChange={(e) => { setSelectedExam(e.target.value); setResultPage(1); }}
              className="w-full sm:w-auto bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0091ad] focus:ring-2 focus:ring-[#0091ad]/20 text-white min-w-[200px]"
            >
              <option value="" disabled>Select Course</option>
              {uniqueExams.map(exam => (
                <option key={exam} value={exam}>{exam}</option>
              ))}
            </select>
            <button onClick={downloadResultsCSV} className="w-full sm:w-auto px-6 py-3 bg-[#0091ad] hover:bg-[#007a91] transition-all rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download Records</button>
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/3">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-white/5 uppercase text-[10px] font-black text-white/30 tracking-widest"><th className="p-5">Student</th><th className="p-5">Matric</th><th className="p-5">Exam</th><th className="p-5 text-center">Score</th><th className="p-5">Violations</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {!selectedExam ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white/40 text-sm">
                      Please select a course to view its examination results.
                    </td>
                  </tr>
                ) : paginatedResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white/40 text-sm">
                      No students have taken this exam yet.
                    </td>
                  </tr>
                ) : paginatedResults.map((r, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-all">
                    <td className="p-5 text-sm font-bold text-white/80">{r.name}</td>
                    <td className="p-5 text-sm font-black text-[#0091ad]">{r.student.matric_number}</td>
                    <td className="p-5 text-sm">{r.exam_title}</td>
                    <td className="p-5 text-center font-black">{r.score === '-' ? '-' : `${r.score}/${r.total}`}</td>
                    <td className="p-5">
                      {(() => {
                        const isBanned = r.student.is_banned;
                        const numViolations = r.violations.length;
                        let btnClass = '';
                        if (isBanned) btnClass = 'bg-red-500 hover:bg-red-600 border-red-400 text-white';
                        else if (numViolations > 0) btnClass = 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30 text-yellow-400';
                        else btnClass = 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-400';

                        return (
                          <button
                            onClick={() => setSelectedStudentForViolations({ student: r.student, violations: r.violations })}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${btnClass}`}
                          >
                            {numViolations}
                          </button>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultTotalPages > 1 && (
            <div className="p-6 bg-white/5 flex items-center justify-center gap-4">
              <button disabled={resultPage === 1} onClick={() => setResultPage(p => p - 1)} className="p-2 rounded-lg bg-black/20 hover:bg-[#0091ad] disabled:opacity-30"><ChevronLeft /></button>
              <span className="text-xs font-black uppercase">PAGE {resultPage} / {resultTotalPages}</span>
              <button disabled={resultPage === resultTotalPages} onClick={() => setResultPage(p => p + 1)} className="p-2 rounded-lg bg-black/20 hover:bg-[#0091ad] disabled:opacity-30"><ChevronRight /></button>
            </div>
          )}
        </div>
      </div>

      {selectedStudentForViolations && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#0d2040] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white">Violations Record</h3>
                <button onClick={() => setSelectedStudentForViolations(null)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-[#0091ad] text-sm font-black tracking-widest uppercase mb-6">{selectedStudentForViolations.student.matric_number}</p>

              <div className="max-h-[400px] overflow-y-auto space-y-3 mb-8 pr-2 custom-scrollbar">
                {selectedStudentForViolations.violations.length === 0 ? (
                  <div className="text-white/40 text-sm py-4">No violations recorded.</div>
                ) : (
                  selectedStudentForViolations.violations.map((v: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs font-bold text-red-400">{v.type}</div>
                      <div className="text-sm mt-1">{v.message}</div>
                      <div className="text-[10px] text-white/30 mt-2">{new Date(v.timestamp).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-4">
                {selectedStudentForViolations.student.is_banned && (
                  <button
                    onClick={() => restoreStudent(selectedStudentForViolations.student.matric_number)}
                    className="flex-1 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" /> Restore
                  </button>
                )}
                <button
                  onClick={() => setSelectedStudentForViolations(null)}
                  className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
