'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getStudentAuth, getAdminAuth, setStudentAuth as saveStudentAuth, setAdminAuth as saveAdminAuth, clearStudentAuth, clearAdminAuth, AuthState } from '@/lib/storage'

interface AuthContextType {
  studentAuth: AuthState | null;
  adminAuth: AuthState | null;
  loginStudent: (nextAuth: AuthState) => void;
  loginAdmin: (nextAuth: AuthState) => void;
  logoutStudent: () => void;
  logoutAdmin: () => void;
  loading: boolean;
  // Fallbacks for generic components
  auth: AuthState | null;
  login: (nextAuth: AuthState) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [studentAuth, setStudentState] = useState<AuthState | null>(null)
  const [adminAuth, setAdminState] = useState<AuthState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setStudentState(getStudentAuth())
    setAdminState(getAdminAuth())
    setLoading(false)

    const onStorage = () => {
      setStudentState(getStudentAuth())
      setAdminState(getAdminAuth())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const loginStudent = (nextAuth: AuthState) => {
    saveStudentAuth(nextAuth)
    setStudentState(nextAuth)
  }

  const loginAdmin = (nextAuth: AuthState) => {
    saveAdminAuth(nextAuth)
    setAdminState(nextAuth)
  }

  const logoutStudent = () => {
    clearStudentAuth()
    setStudentState(null)
  }

  const logoutAdmin = () => {
    clearAdminAuth()
    setAdminState(null)
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { 
      studentAuth, adminAuth, 
      loginStudent, loginAdmin, 
      logoutStudent, logoutAdmin, 
      loading,
      auth: studentAuth, // Default auth refers to student
      login: loginStudent,
      logout: logoutStudent
    } },
    children
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
