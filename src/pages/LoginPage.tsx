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
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col justify-between bg-maroon-900 p-12 lg:flex">
        <p className="font-display text-4xl font-bold tracking-tight text-white">JVLI</p>
        <div>
          <p className="max-w-sm font-display text-3xl font-semibold leading-tight text-white">
            Every meter bought, cut and left, in one place.
          </p>
          <div
            className="mt-8 h-3 w-72 rounded-sm bg-white/15"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0, transparent 9px, rgba(102,0,0,0.9) 9px, rgba(102,0,0,0.9) 10px)',
            }}
          />
        </div>
        <p className="text-sm text-maroon-200/70">Fabric inventory</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="mb-8 font-display text-3xl font-bold tracking-tight text-maroon-900 lg:hidden">JVLI</p>
          <h1 className="font-display text-2xl font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-stone-500">Use the username and password the team gave you.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
    </div>
  )
}
