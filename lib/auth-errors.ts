/** Maps Supabase auth/API messages to clearer German copy. */
export function mapAuthError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes("issued at future") || lower.includes("issued in the future")) {
    return "Die Systemuhr ist falsch eingestellt (JWT-Zeit in der Zukunft). Windows: Einstellungen → Zeit und Sprache → Uhrzeit synchronisieren. Danach Seite neu laden und erneut anmelden."
  }

  if (lower.includes("jwt expired") || lower.includes("token is expired")) {
    return "Die Anmeldung ist abgelaufen. Bitte erneut anmelden."
  }

  return message
}

export function isClockSkewError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes("issued at future") || lower.includes("issued in the future")
}
