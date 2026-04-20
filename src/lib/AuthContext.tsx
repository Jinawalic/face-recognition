'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getAuth, setAuth as saveAuth, clearAuth, AuthState } from '@/lib/storage'

interface AuthContextType {
  auth: AuthState | null;
  login: (nextAuth: AuthState) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * AuthProvider component that provides authentication state to the application.
 * Using an explicit function declaration and return type to resolve JSX component issues.
 */
export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [auth, setAuthState] = useState<AuthState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial load from storage
    const savedAuth = getAuth()
    setAuthState(savedAuth)
    setLoading(false)

    // Sync across tabs
    const onStorage = () => {
      setAuthState(getAuth())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = (nextAuth: AuthState) => {
    saveAuth(nextAuth)
    setAuthState(nextAuth)
  }

  const logout = () => {
    clearAuth()
    setAuthState(null)
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { auth, login, logout, loading } },
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
