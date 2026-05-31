/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services/authApi'
import {
  AUTH_SESSION_CHANGED_EVENT,
  clearSession,
  getRefreshToken,
  getStoredUser,
  saveSession,
} from './session'
import type { AuthUser } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isSuperAdmin: boolean
  isTenantAdmin: boolean
  isOperationsStaff: boolean
  isInstructor: boolean
  isTenantUser: boolean
  tenantId: AuthUser['tenantId']
  setSession: (session: {
    accessToken: string
    refreshToken: string
    user: AuthUser
  }) => void
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())

  useEffect(() => {
    const syncSession = () => setUser(getStoredUser())

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession)
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => {
      const normalizedRole = user?.role?.replace(/\s+/g, '').toLowerCase() ?? ''
      const isSuperAdmin = normalizedRole === 'superadmin'
      const isTenantAdmin = normalizedRole === 'tenantadmin'
      const isOperationsStaff = normalizedRole === 'operationsstaff'
      const isInstructor = normalizedRole === 'instructor'

      return {
        user,
        isAuthenticated: Boolean(user),
        isSuperAdmin,
        isTenantAdmin,
        isOperationsStaff,
        isInstructor,
        isTenantUser: Boolean(user) && !isSuperAdmin,
        tenantId: user?.tenantId ?? null,
        setSession: (session) => {
          saveSession(session)
          setUser(getStoredUser())
        },
        logout: async () => {
          const refreshToken = getRefreshToken()

          try {
            if (refreshToken) {
              await authApi.logout(refreshToken)
            }
          } finally {
            clearSession()
            setUser(null)
            window.history.pushState({}, '', '/')
          }
        },
        hasPermission: (permission) => user?.permissions.includes(permission) ?? false,
      }
    },
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
