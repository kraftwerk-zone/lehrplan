import { AuthGate } from "@/components/auth/auth-gate"
import { AuthProvider } from "@/components/auth/auth-context"

export default function Page() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
