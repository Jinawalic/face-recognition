'use client'
import { useState, useMemo } from 'react'
import { ShieldBan, ShieldCheck, X, ChevronLeft, ChevronRight, AlertTriangle, User, Download } from 'lucide-react'
import { useAdminData } from '@/hooks/useAdminData'
import { apiPost } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ViolationsManagement() {
  const { students, refreshStudents, apiBaseUrl, token } = useAdminData()
  const [page, setPage] = useState(1)
  const [selectedStudentForViolations, setSelectedStudentForViolations] = useState<any | null>(null)
  const itemsPerPage = 8

  const bannedStudents = useMemo(() => {
    return students.filter(s => s.is_banned).map(s => ({
      ...s,
      name: `${s.surname || ''} ${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unspecified'
    }))
  }, [students])

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return bannedStudents.slice(start, start + itemsPerPage)
  }, [bannedStudents, page])

  const totalPages = Math.ceil(bannedStudents.length / itemsPerPage) || 1

  const restoreStudent = async (matricNumber: string) => {
    const restorePromise = async () => {
      await apiPost(`${apiBaseUrl}/admin/students/set-banned`, { matricNumber, is_banned: false }, { token })
      refreshStudents()
      setSelectedStudentForViolations(null)
    }

    toast.promise(restorePromise(), {
      loading: 'Restoring student...',
      success: 'Student restored and violations cleared',
      error: 'Failed to restore student'
    })
  }

  const downloadViolationsCSV = () => {
    const rows: string[][] = [['Student Name', 'Matric Number', 'Department', 'Violation Count', 'Latest Violation']]
    bannedStudents.forEach(s => {
      const latest = s.violations.length > 0 ? s.violations[0].type : 'N/A'
      rows.push([s.name, s.matric_number, s.department || 'General', s.violations.length.toString(), latest])
    })
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `suspended_students_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="mb-10 lg:mb-12">
        <h1 className="text-xl lg:text-2xl font-bold text-white capitalize flex items-center gap-3">
          <ShieldBan className="text-red-500 w-8 h-8" /> 
          Examination Violations
        </h1>
        <p className="text-white/40 mt-2 font-medium">Students flagged for serious irregularities and suspended from exams.</p>
      </div>

      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10 gap-4">
          <div>
            <h2 className="text-xl font-bold text-red-400">{bannedStudents.length} Suspended Students</h2>
            <p className="text-xs text-white/30 uppercase font-black tracking-widest mt-1">Requiring Review & Restoration</p>
          </div>
          <button 
            onClick={downloadViolationsCSV} 
            disabled={bannedStudents.length === 0}
            className="w-full sm:w-auto px-6 py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 border border-red-500/20 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/3">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 uppercase text-[10px] font-black text-white/30 tracking-widest">
                  <th className="p-5">Student</th>
                  <th className="p-5">Matric</th>
                  <th className="p-5">Dept</th>
                  <th className="p-5 text-center">Violations</th>
                  <th className="p-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4 text-white/20">
                        <ShieldCheck className="w-12 h-12" />
                        <p className="text-sm font-bold">No students are currently suspended for violations.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s) => (
                    <tr key={s.matric_number} className="hover:bg-white/5 transition-all">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-white/80">{s.name}</span>
                        </div>
                      </td>
                      <td className="p-5 text-sm font-black text-[#0091ad]">{s.matric_number}</td>
                      <td className="p-5 text-sm text-white/40">{s.department || 'General'}</td>
                      <td className="p-5 text-center">
                        <button
                          onClick={() => setSelectedStudentForViolations(s)}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-red-500 text-white shadow-lg shadow-red-500/10 hover:bg-red-600 transition-all"
                        >
                          {s.violations.length}
                        </button>
                      </td>
                      <td className="p-5 text-right">
                        <button
                          onClick={() => restoreStudent(s.matric_number)}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-6 bg-white/5 flex items-center justify-center gap-4 border-t border-white/5">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg bg-black/20 hover:bg-[#0091ad] disabled:opacity-30"><ChevronLeft /></button>
              <span className="text-xs font-black uppercase">PAGE {page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg bg-black/20 hover:bg-[#0091ad] disabled:opacity-30"><ChevronRight /></button>
            </div>
          )}
        </div>
      </div>

      {selectedStudentForViolations && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#0d2040] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="text-red-500 w-5 h-5" />
                  Irregularity Logs
                </h3>
                <button onClick={() => setSelectedStudentForViolations(null)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-[#0091ad] text-sm font-black tracking-widest uppercase mb-6">{selectedStudentForViolations.matric_number}</p>

              <div className="max-h-[400px] overflow-y-auto space-y-3 mb-8 pr-2 custom-scrollbar">
                {selectedStudentForViolations.violations.length === 0 ? (
                  <div className="text-white/40 text-sm py-4">No specific violation logs found.</div>
                ) : (
                  selectedStudentForViolations.violations.map((v: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 border-l-red-500/50 border-l-4">
                      <div className="text-xs font-bold text-red-400 uppercase tracking-tighter">{v.type}</div>
                      <div className="text-sm mt-1 text-white/80">{v.message}</div>
                      <div className="text-[10px] text-white/30 mt-2 font-medium">{new Date(v.timestamp).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => restoreStudent(selectedStudentForViolations.matric_number)}
                  className="flex-1 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" /> Restore Student
                </button>
                <button
                  onClick={() => setSelectedStudentForViolations(null)}
                  className="px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95"
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
