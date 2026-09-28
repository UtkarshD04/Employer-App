import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { tokenStore, setUnauthorizedHandler } from '../lib/api'
import * as authService from '../services/authService'
import { getCompany } from '../services/companyService'
import { syncPushToken } from '../lib/pushNotifications'
import { queryClient } from '../lib/queryClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [session, setSession] = useState(null) // { user, company }
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const loggingOut = useRef(false)
  const logout = useCallback(async () => {
    if (loggingOut.current) return
    loggingOut.current = true
    try {
      await tokenStore.clear()
      setToken(null)
      setSession(null)
      // Drop the previous account's cached data so the next sign-in never briefly shows it.
      queryClient.clear()
    } finally {
      loggingOut.current = false
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  useEffect(() => {
    ;(async () => {
      let stored
      try {
        stored = await tokenStore.get()
      } catch {
        // unreadable stored token — treat as logged out
      }
      if (!stored) {
        setIsBootstrapping(false)
        return
      }
      try {
        // /auth/me returns just the user; the company (name/logo) is a separate call.
        const [user, company] = await Promise.all([authService.getMe(), getCompany().catch(() => null)])
        setToken(stored)
        setSession({ user, company })
        syncPushToken()
      } catch {
        // the 401 interceptor already clears the stored token on auth failure
      } finally {
        setIsBootstrapping(false)
      }
    })()
  }, [])

  const signIn = useCallback(async (email, password) => {
    const data = await authService.login(email, password)
    setToken(data.token)
    setSession({ user: data.user, company: data.company })
    syncPushToken()
  }, [])

  const value = {
    token,
    user: session?.user ?? null,
    company: session?.company ?? null,
    isAuthenticated: !!token,
    isBootstrapping,
    signIn,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
