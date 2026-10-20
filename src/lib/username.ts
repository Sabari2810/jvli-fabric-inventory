// People log in with a username. Supabase Auth needs an email-shaped ID, so a
// username is stored as username@jvli.store. No email is ever sent to it.
export const LOGIN_DOMAIN = 'jvli.store'

export function usernameToEmail(input: string): string {
  const value = input.trim().toLowerCase()
  return value.includes('@') ? value : `${value}@${LOGIN_DOMAIN}`
}

export function emailToUsername(email: string | null | undefined): string {
  if (!email) return ''
  const suffix = `@${LOGIN_DOMAIN}`
  return email.toLowerCase().endsWith(suffix) ? email.slice(0, -suffix.length) : email
}
