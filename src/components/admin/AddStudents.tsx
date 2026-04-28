'use client'
import { useState, FormEvent, ChangeEvent } from 'react'
import { UserPlus, Upload, AlertTriangle, Check } from 'lucide-react'
import { useAdminData } from '@/hooks/useAdminData'
import { apiPost } from '@/lib/api'

export default function AddStudents() {
  const { refreshStudents, apiBaseUrl, token } = useAdminData()
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [studentForm, setStudentForm] = useState({ matricNumber: '', surname: '', firstName: '', lastName: '', department: '' })

  const onAddSingle = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setOkMsg('')
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
    setError(''); setOkMsg('')
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

  return (
    <>
      <div className="mb-10 lg:mb-12">
        <h1 className="text-2xl lg:text-2xl font-bold text-white capitalize">Add Students</h1>
        <p className="text-white/40 mt-2 font-medium">Enroll new students individually or in bulk via CSV.</p>
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

      <div className="grid grid-cols-1 gap-8 animate-fade-in">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:p-10 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-[#0091ad] rounded-full" />
            <h2 className="text-xl font-bold">Manual Enrollment</h2>
          </div>
          <form onSubmit={onAddSingle} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-bold text-white/30 uppercase pl-1">Matric Number</label>
              <input required value={studentForm.matricNumber} onChange={e => setStudentForm({ ...studentForm, matricNumber: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#0091ad] focus:ring-4 focus:ring-[#0091ad]/10 transition-all font-bold" placeholder="CSC/21/042" />
            </div>
            <div className="space-y-2"><label className="text-xs font-bold text-white/30 uppercase pl-1">Surname</label>
              <input value={studentForm.surname} onChange={e => setStudentForm({ ...studentForm, surname: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#0091ad] transition-all" /></div>
            <div className="space-y-2"><label className="text-xs font-bold text-white/30 uppercase pl-1">First Name</label>
              <input value={studentForm.firstName} onChange={e => setStudentForm({ ...studentForm, firstName: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#0091ad] transition-all" /></div>
            <div className="space-y-2"><label className="text-xs font-bold text-white/30 uppercase pl-1">Last Name</label>
              <input value={studentForm.lastName} onChange={e => setStudentForm({ ...studentForm, lastName: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#0091ad] transition-all" /></div>
            <div className="space-y-2"><label className="text-xs font-bold text-white/30 uppercase pl-1">Department</label>
              <input value={studentForm.department} onChange={e => setStudentForm({ ...studentForm, department: e.target.value })} className="w-full rounded-2xl bg-black/40 border border-white/10 p-4 outline-none focus:border-[#0091ad] transition-all" /></div>
            <button className="sm:col-span-2 mt-6 bg-[#0091ad] hover:bg-[#007a91] py-5 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-[#0091ad]/20 flex items-center justify-center gap-3">
              <UserPlus className="w-5 h-5" /> Enroll Student
            </button>
          </form>
        </div>
        <div className="rounded-3xl border-2 border-dashed border-white/10 bg-white/2 p-12 text-center group hover:bg-white/5 transition-all">
          <Upload className="w-12 h-12 text-[#0091ad] mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-3">Bulk Upload</h2>
          <input type="file" accept=".csv" onChange={onFileUpload} className="hidden" id="csvUpload" />
          <label htmlFor="csvUpload" className="inline-block px-12 py-4 bg-[#0091ad] hover:bg-[#007a91] rounded-2xl cursor-pointer transition-all border border-white/5 uppercase text-sm shadow-xl shadow-[#0091ad]/20">Upload CSV File</label>
        </div>
      </div>
    </>
  )
}
