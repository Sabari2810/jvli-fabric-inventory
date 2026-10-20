import { useState, type FormEvent } from 'react'
import { Navigate } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'
import { usernameToEmail } from '../lib/username'
import { ErrorNote, Field, inputClass, primaryButton } from '../components/ui'

export function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && session) return <Navigate to="/" />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await signIn(usernameToEmail(username), password)
    if (message) {
      setError(
        message.toLowerCase().includes('invalid login')
          ? 'Wrong username or password.'
          : message,
      )
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-3xl font-semibold tracking-tight text-maroon-900">JVLI</p>
          <p className="mt-1 text-sm text-stone-500">Fabric inventory</p>
        </div>
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <Field label="Username">
            <input
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <ErrorNote message={error} />
          <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
            {busy ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
