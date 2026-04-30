'use client'
import { useState, FormEvent, useMemo } from 'react'
import { Eye, Trash2, Edit3, ShieldBan, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, Users, X, AlertTriangle, UserPlus, Upload, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAdminData, Student } from '@/hooks/useAdminData'
import { apiPost } from '@/lib/api'

export default function ViewRegistered() {
  const { students, refreshStudents, loading, apiBaseUrl, token } = useAdminData()
  const [studentPage, setStudentPage] = useState(1)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ surname: '', firstName: '', lastName: '', department: '' })
  
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [studentForm, setStudentForm] = useState({ matricNumber: '', surname: '', firstName: '', lastName: '', department: '' })
  const [bulkStatus, setBulkStatus] = useState({ error: '', ok: '' })

  const itemsPerPage = 8

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * itemsPerPage
    return students.slice(start, start + itemsPerPage)
  }, [students, studentPage])

  const studentTotalPages = Math.ceil(students.length / itemsPerPage) || 1

  const handleDelete = async (matric: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Delete Student?</p>
            <p className="text-xs text-white/50">Permanently remove {matric}?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id)
              const deletePromise = async () => {
                const res = await fetch(`${apiBaseUrl}/admin/students/${encodeURIComponent(matric)}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                })
                if (!res.ok) {
                  const data = await res.json()
                  throw new Error(data.message || 'Failed to delete')
                }
                refreshStudents()
                if (selectedStudent?.matric_number === matric) setSelectedStudent(null)
              }
              toast.promise(deletePromise(), {
                loading: 'Deleting...',
                success: 'Student deleted successfully',
                error: (err) => err.message
              })
            }}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest"
          >
            Confirm
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 py-2 bg-white/5 text-white/60 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 5000, style: { minWidth: '300px' } })
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return
    
    const updatePromise = async () => {
      const res = await fetch(`${apiBaseUrl}/admin/students/update/${encodeURIComponent(selectedStudent.matric_number)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editForm)
      })
      if (!res.ok) throw new Error('Update failed')
      
      setIsEditMode(false)
      refreshStudents()
      setSelectedStudent({ ...selectedStudent, ...editForm })
    }

    toast.promise(updatePromise(), {
      loading: 'Updating profile...',
      success: 'Profile updated successfully',
      error: 'Failed to update profile'
    })
  }

  const onAddSingle = async (e: FormEvent) => {
    e.preventDefault()
    if (!studentForm.matricNumber) return
    const addPromise = async () => {
      await apiPost(`${apiBaseUrl}/admin/students`, studentForm, { token })
      setIsSingleModalOpen(false)
      setStudentForm({ matricNumber: '', surname: '', firstName: '', lastName: '', department: '' })
      refreshStudents()
    }
    toast.promise(addPromise(), {
      loading: 'Adding student...',
      success: `Added ${studentForm.matricNumber.toUpperCase()}`,
      error: (e) => e?.message || 'Failed to add'
    })
  }

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBulkStatus({ error: '', ok: '' })
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) throw new Error('CSV is empty')
        const header = lines[0]
        const delimiter = header.includes(';') ? ';' : header.includes('\t') ? '\t' : ','
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
        if (studentsToUpload.length === 0) throw new Error('No valid students found')
        
        setBulkStatus({ error: '', ok: `Uploading ${studentsToUpload.length} students...` })
        const data = await apiPost<{ inserted: number; skipped: number }>(`${apiBaseUrl}/admin/students/bulk`, { students: studentsToUpload }, { token })
        setBulkStatus({ error: '', ok: `Success! ${data.inserted} added, ${data.skipped} skipped.` })
        refreshStudents()
      } catch (err: any) {
        setBulkStatus({ error: err.message || 'Upload failed', ok: '' })
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className="mb-10 lg:mb-12">
        <h1 className="text-xl lg:text-2xl font-bold text-white capitalize">Registered Students</h1>
        <p className="text-white/40 mt-2 font-medium">Browse, update, or remove registered students.</p>
      </div>

      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10 gap-4">
          <div className="flex items-center gap-4">
            <div className="font-bold text-lg">{students.length} Registered</div>
            <div className="flex gap-2">
              <button onClick={() => setIsSingleModalOpen(true)} className="px-4 py-2 bg-[#0091ad]/10 text-[#0091ad] border border-[#0091ad]/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0091ad] hover:text-white transition-all flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5" /> Single
              </button>
              <button onClick={() => setIsBulkModalOpen(true)} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" /> Bulk
              </button>
            </div>
          </div>
          <button onClick={refreshStudents} className="w-full sm:w-auto text-[10px] uppercase font-black tracking-widest text-white/40 bg-white/5 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2">
            <RefreshCw className={loading ? 'animate-spin' : ''} size={14} /> Sync
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
                    <td className="p-6 font-black text-sm text-[#0091ad]">{s.matric_number}</td>
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
              <button disabled={studentPage === 1} onClick={() => setStudentPage(p => p - 1)} className="p-2 rounded-lg bg-black/20 hover:bg-[#0091ad] disabled:opacity-30"><ChevronLeft /></button>
              <span className="text-xs font-black">PAGE {studentPage} / {studentTotalPages}</span>
              <button disabled={studentPage === studentTotalPages} onClick={() => setStudentPage(p => p + 1)} className="p-2 rounded-lg bg-black/20 hover:bg-[#0091ad] disabled:opacity-30"><ChevronRight /></button>
            </div>
          )}
        </div>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-[#0d2040] border border-white/10 rounded-[10px] overflow-hidden shadow-2xl relative">
            <button onClick={() => setSelectedStudent(null)} className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all"><X /></button>
            <div className="p-6">
              <div className="flex items-center gap-6 mb-10">
                <div className="w-12 h-12 rounded-xl bg-[#0091ad]/10 flex items-center justify-center text-[#0091ad] border border-[#0091ad]/20">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedStudent.surname}, {selectedStudent.first_name}</h2>
                  <p className="text-[#0091ad] font-bold uppercase text-sm mt-1">{selectedStudent.matric_number}</p>
                </div>
              </div>

              {isEditMode ? (
                <form onSubmit={handleUpdate} className="grid grid-cols-2 gap-6 animate-fade-in">
                  <div className="space-y-1"><label className="text-[10px] uppercase font-black text-white/30 ml-1">Surname</label>
                    <input value={editForm.surname} onChange={e => setEditForm({ ...editForm, surname: e.target.value })} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#0091ad]" /></div>
                  <div className="space-y-1"><label className="text-[10px] uppercase font-black text-white/30 ml-1">First Name</label>
                    <input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#0091ad]" /></div>
                  <div className="space-y-1"><label className="text-[10px] uppercase font-black text-white/30 ml-1">Department</label>
                    <input value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#0091ad]" /></div>
                  <div className="col-span-2 flex gap-4 mt-4">
                    <button type="submit" className="flex-1 py-4 bg-[#0091ad] text-white rounded-2xl font-black uppercase tracking-widest">Save Changes</button>
                    <button type="button" onClick={() => setIsEditMode(false)} className="px-10 py-4 bg-white/5 rounded-2xl font-black uppercase tracking-widest border border-white/10">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="space-y-10 animate-fade-in">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1"><div className="text-[10px] uppercase font-black text-white/30">Department</div><div className="font-bold text-lg">{selectedStudent.department || 'General'}</div></div>
                    <div className="space-y-1"><div className="text-[10px] uppercase font-black text-white/30">Status</div><div className={['font-bold text-lg', selectedStudent.is_banned ? 'text-red-400' : 'text-emerald-400'].join(' ')}>{selectedStudent.is_banned ? 'Suspended' : 'Verified'}</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setIsEditMode(true)} className="py-4 rounded-2xl bg-white/5 border border-white/10 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                      <Edit3 className="w-4 h-4" /> Update Profile
                    </button>
                    <button onClick={() => handleDelete(selectedStudent.matric_number)} className="py-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                      <Trash2 className="w-4 h-4" /> Delete Student
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isSingleModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-lg bg-[#0a1829] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-3"><UserPlus className="text-[#0091ad]" /> Manual Enrollment</h2>
                <button onClick={() => setIsSingleModalOpen(false)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><X /></button>
              </div>
              <form onSubmit={onAddSingle} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/30 ml-1">Matric Number</label>
                  <input required value={studentForm.matricNumber} onChange={e => setStudentForm({ ...studentForm, matricNumber: e.target.value })} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#0091ad] font-bold uppercase" placeholder="CSC/21/001" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase text-white/30 ml-1">Surname</label>
                    <input value={studentForm.surname} onChange={e => setStudentForm({ ...studentForm, surname: e.target.value })} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#0091ad]" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase text-white/30 ml-1">First Name</label>
                    <input value={studentForm.firstName} onChange={e => setStudentForm({ ...studentForm, firstName: e.target.value })} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#0091ad]" /></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase text-white/30 ml-1">Department</label>
                  <input value={studentForm.department} onChange={e => setStudentForm({ ...studentForm, department: e.target.value })} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-[#0091ad]" /></div>
                <button type="submit" className="w-full py-5 bg-[#0091ad] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#0091ad]/20 mt-4">Enroll Student</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-lg bg-[#0a1829] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-3"><Upload className="text-emerald-500" /> Bulk Enrollment</h2>
                <button onClick={() => setIsBulkModalOpen(false)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><X /></button>
              </div>
              
              <div className="space-y-6">
                <div className="p-10 border-2 border-dashed border-white/10 rounded-3xl bg-white/2 text-center">
                  <Upload className="w-12 h-12 text-[#0091ad] mx-auto mb-6" />
                  <p className="text-white/40 text-sm mb-6">Select a CSV file containing student records.</p>
                  <input type="file" accept=".csv" onChange={onFileUpload} className="hidden" id="modalBulk" />
                  <label htmlFor="modalBulk" className="inline-block px-10 py-4 bg-[#0091ad] hover:bg-[#007a91] rounded-2xl cursor-pointer font-black uppercase text-[10px] tracking-widest shadow-lg shadow-[#0091ad]/20 transition-all">Choose CSV</label>
                </div>

                {(bulkStatus.error || bulkStatus.ok) && (
                  <div className={['p-4 rounded-xl text-xs font-bold border', bulkStatus.error ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'].join(' ')}>
                    {bulkStatus.error || bulkStatus.ok}
                  </div>
                )}

                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-[10px] font-black uppercase text-white/30 mb-2">CSV Format Header</p>
                  <code className="text-[10px] text-[#0091ad]">matricNumber, surname, firstName, lastName, department</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
