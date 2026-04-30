'use client'
import { useState, FormEvent } from 'react'
import { BookOpen, Trash2, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAdminData } from '@/hooks/useAdminData'
import { apiPost } from '@/lib/api'

export default function ConfigureExams() {
  const { exams, refreshExams, apiBaseUrl, token } = useAdminData()
  const [selectedExamId, setSelectedExamId] = useState('')
  const [isCreatingNewExam, setIsCreatingNewExam] = useState(false)
  const [examForm, setExamForm] = useState({ title: '', description: '' })
  const [questionForm, setQuestionForm] = useState({ text: '', options: ['', '', '', ''], correctIndex: 0 })
  const [okMsg, setOkMsg] = useState('')

  const onAddExam = async (e: FormEvent) => {
    e.preventDefault()
    if (!examForm.title) return
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
      console.error(e)
    }
  }

  const onAddQuestion = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedExamId || !questionForm.text) return
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
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Delete Exam?</p>
            <p className="text-xs text-white/50">Remove {title} and all its data?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id)
              const deletePromise = async () => {
                const res = await fetch(`${apiBaseUrl}/admin/exams/${id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                })
                if (!res.ok) throw new Error('Failed to delete')
                refreshExams()
                if (selectedExamId === id) setSelectedExamId('')
              }
              toast.promise(deletePromise(), {
                loading: 'Deleting...',
                success: 'Exam deleted successfully',
                error: 'Failed to delete exam'
              })
            }}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest"
          >
            Confirm
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="flex-1 py-2 bg-white/5 text-white/60 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10">Cancel</button>
        </div>
      </div>
    ), { duration: 5000, style: { minWidth: '300px' } })
  }

  return (
    <>
      <div className="mb-10 lg:mb-12 rounded-xs">
        <h1 className="text-xl lg:text-2xl font-bold text-white capitalize">Configure Exams</h1>
        <p className="text-white/40 mt-2 font-medium">Create new examinations and add questions.</p>
      </div>

      {okMsg && (
        <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-sm text-emerald-200 animate-fade-in">
          {okMsg}
        </div>
      )}

      <div className="space-y-3 animate-fade-in">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 lg:p-12 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-3"><BookOpen className="w-6 h-6 text-[#0091ad]" /> Exam Setup</h2>
            <button onClick={() => { setIsCreatingNewExam(!isCreatingNewExam); setSelectedExamId('') }} className="w-full sm:w-auto px-6 py-3 bg-[#0091ad] hover:bg-[#007a91] rounded-xl font-bold uppercase text-[10px] ">{isCreatingNewExam ? 'Cancel' : 'Create New Exam'}</button>
          </div>
          {isCreatingNewExam ? (
            <form onSubmit={onAddExam} className="space-y-6">
              <input required value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} placeholder="Exam Title" className="w-full p-5 rounded-2xl bg-black/40 border border-white/10 outline-none focus:border-[#0091ad]" />
              <textarea value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} placeholder="Instructions/Description" className="w-full p-5 rounded-2xl bg-black/40 border border-white/10 min-h-[150px] outline-none" />
              <button className="w-full py-5 bg-[#0091ad] rounded-2xl font-black uppercase text-sm">Create Instance</button>
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
                  <button className="w-full py-5 bg-[#0091ad] rounded-2xl font-black uppercase tracking-widest text-sm">Save Question</button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Exam List Display - Tabular Form */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/3 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 uppercase text-[10px] font-black text-white/30 tracking-[.2em]">
                  <th className="p-6">Title</th>
                  <th className="p-6">Description</th>
                  <th className="p-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {exams.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-white/20 font-bold italic">
                      No examinations configured yet.
                    </td>
                  </tr>
                ) : (
                  exams.map(e => (
                    <tr key={e.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-6 font-bold text-sm text-[#0091ad]">{e.title}</td>
                      <td className="p-6 text-sm text-white/40 line-clamp-1 max-w-xs">{e.description || '---'}</td>
                      <td className="p-6 text-center space-x-3">
                        <button
                          onClick={() => { setSelectedExamId(e.id); setIsCreatingNewExam(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                          className="px-4 py-2 rounded-xl bg-[#0091ad]/10 text-[#0091ad] text-[10px] font-black uppercase tracking-widest hover:bg-[#0091ad] hover:text-white transition-all"
                        >
                          Manage
                        </button>
                        <button
                          onClick={() => handleDelete(e.id, e.title)}
                          className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
