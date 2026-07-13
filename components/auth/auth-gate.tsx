"use client"

import dynamic from "next/dynamic"
import { isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "./auth-context"
import { LoginScreen } from "./login-screen"

const Planner = dynamic(() => import("@/components/curriculum/planner").then((m) => m.Planner), {
  ssr: false,
  loading: () => <div className="min-h-svh bg-background" aria-hidden />,
})

export function AuthGate() {
  const { user, ready } = useAuth()

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Supabase nicht konfiguriert</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bitte <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> und{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> als Umgebungsvariablen setzen (lokal in{" "}
            <code className="text-xs">.env.local</code>, auf Vercel unter Project Settings → Environment Variables).
          </p>
        </div>
      </div>
    )
  }

  // Avoid a login-screen flash before the Supabase session is restored.
  if (!ready) return <div className="min-h-svh bg-background" aria-hidden />

  return user ? <Planner /> : <LoginScreen />
}
