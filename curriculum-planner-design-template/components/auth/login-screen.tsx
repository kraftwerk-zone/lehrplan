"use client"

import { CalendarRange, Eye, EyeOff, LogIn } from "lucide-react"
import { useState } from "react"
import { useAuth } from "./auth-context"

export function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError("Bitte E-Mail und Passwort eingeben.")
      return
    }
    setError(null)
    login(email.trim(), password)
  }

  return (
    <main className="flex min-h-svh flex-col bg-background md:flex-row">
      {/* Visual panel */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-muted p-10 md:flex">
        <img
          src="/images/login-side.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />
        <div className="relative flex items-center gap-2 text-foreground">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarRange className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Lehrplan</span>
        </div>
        <div className="relative max-w-sm">
          <h2 className="text-balance text-2xl font-semibold text-foreground">
            Dein Schuljahr, klar geplant.
          </h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            Themen per Drag-and-Drop einplanen, Puffertage berücksichtigen, Materialien und Punkte pro Kind verwalten.
          </p>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarRange className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-foreground">Lehrplan</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Anmelden</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Melde dich an, um deinen Lehrplan zu bearbeiten.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@schule.de"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Passwort
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <LogIn className="size-4" />
              Anmelden
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Prototyp – jede beliebige E-Mail und jedes Passwort funktionieren.
          </p>
        </div>
      </section>
    </main>
  )
}
