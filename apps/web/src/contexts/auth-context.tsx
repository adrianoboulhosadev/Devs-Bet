'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { LoginUserInput, RegisterUserInput, UserDTO } from '@auth/adapters'
import { api, setAccessToken, refreshAccessToken } from '@/lib/api'

// Reuses the DTO from adapters: the front needs id, email and role (admin UI).
type AuthenticatedUser = Pick<UserDTO, 'id' | 'email' | 'role'>

interface Auth {
  user: AuthenticatedUser | null
  loading: boolean
  isAdmin: boolean
  login: (input: LoginUserInput) => Promise<void>
  register: (input: RegisterUserInput) => Promise<void>
  // Google ID token (from the NextAuth bridge, see useGoogleOAuthBridge) — the
  // backend verifies it and issues the SAME access/refresh session as `login`.
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  clearSession: () => void
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const { data } = await api.get<AuthenticatedUser>('/user/me')
    setUser(data)
  }, [])

  // Silent refresh on boot: if the refresh cookie is valid, it recovers the session.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await refreshAccessToken()
        if (active) await loadUser()
      } catch {
        if (active) {
          setAccessToken(null)
          setUser(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [loadUser])

  const login = useCallback(
    async (input: LoginUserInput) => {
      const { data } = await api.post<{ accessToken: string }>('/auth/login', input)
      setAccessToken(data.accessToken)
      await loadUser()
    },
    [loadUser],
  )

  // Sign-up does NOT log anyone in: this is a closed platform, so the account is
  // created and then waits for an admin to release it (see the pending screen).
  const register = useCallback(async (input: RegisterUserInput) => {
    await api.post('/auth/register', input)
  }, [])

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const { data } = await api.post<{ accessToken: string }>('/auth/oauth/google', { idToken })
      setAccessToken(data.accessToken)
      await loadUser()
    },
    [loadUser],
  )

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/user/logout')
    } finally {
      clearSession()
    }
  }, [clearSession])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'admin',
        login,
        register,
        loginWithGoogle,
        logout,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): Auth {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an <AuthProvider>')
  return context
}
