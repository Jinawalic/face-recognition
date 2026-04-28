'use client'
import { useState, FormEvent } from 'react'
import { BookOpen } from 'lucide-react'
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

  return (
    <>
      <div className="mb-10 lg:mb-12">
        <h1 className="text-xl lg:text-2xl font-bold text-white capitalize">Configure Exams</h1>
        <p className="text-white/40 mt-2 font-medium">Create new examinations and add questions.</p>
      </div>

      {okMsg && (
        <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-sm text-emerald-200 animate-fade-in">
          {okMsg}
        </div>
      )}

      <div className="space-y-8 animate-fade-in">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:p-12 shadow-2xl backdrop-blur-xl">
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
      </div>
    </>
  )
}
