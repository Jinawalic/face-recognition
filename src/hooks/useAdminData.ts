'use client'
import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'

export interface Violation { type: string; message: string; timestamp: string; }
export interface StudentResult { exam_title: string; score: number; total: number; createdAt: string; }
export interface Student {
  matric_number: string; surname: string; first_name: string; last_name: string;
  department: string; is_banned: boolean; violation_count: number;
  violations: Violation[]; results: StudentResult[];
}
export interface Exam { id: string; title: string; description: string; }

export function useAdminData() {
  const { adminAuth: auth } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const token = auth?.token
  const apiBaseUrl = '/api'

  const refreshStudents = useCallback(async () => {
    if (!token) return
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
  }, [token])

  const refreshExams = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${apiBaseUrl}/admin/exams/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setExams(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load exams', e)
    }
  }, [token])

  useEffect(() => {
    refreshStudents()
    refreshExams()
  }, [refreshStudents, refreshExams])

  return {
    students, setStudents,
    exams, setExams,
    loading, error, setError,
    refreshStudents, refreshExams,
    token, apiBaseUrl
  }
}
