"use client"

import { Planner } from "@/components/curriculum/planner"
import { useAuth } from "./auth-context"
import { LoginScreen } from "./login-screen"

export function AuthGate() {
  const { user, ready } = useAuth()

  // Avoid a login-screen flash before the Supabase session is restored.
  if (!ready) return <div className="min-h-svh bg-background" aria-hidden />

  return user ? <Planner /> : <LoginScreen />
}
