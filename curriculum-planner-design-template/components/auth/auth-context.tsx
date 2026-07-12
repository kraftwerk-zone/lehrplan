"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

/**
 * Prototype-only authentication. There is NO backend: any email/password is
 * accepted and the "session" is kept in sessionStorage so a reload stays
 * signed in. Swap this out for Better Auth + Neon when real accounts are needed.
 */

export interface AuthUser {
  name: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  ready: boolean
  login: (email: string, password: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = "lehrplan.auth.user"

function nameFromEmail(email: string): string {
  const handle = email.split("@")[0] ?? "Lehrkraft"
  return handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Lehrkraft"
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  // Restore any prototype session on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw) as AuthUser)
    } catch {
      // ignore malformed storage
    }
    setReady(true)
  }, [])

  const login = useCallback((email: string, _password: string) => {
    const next: AuthUser = { name: nameFromEmail(email), email }
    setUser(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage failures in the prototype
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
