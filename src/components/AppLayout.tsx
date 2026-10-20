import { Link, Navigate, Outlet } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'
import { emailToUsername } from '../lib/username'
import { Loading, subtleButton } from './ui'

const navLink =
  'rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900'
const navActive = '!bg-maroon-50 !text-maroon-900'

export function AppLayout() {
  const { session, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen">
        <Loading label="Checking your session" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" />

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-maroon-900">JVLI</span>
            <span className="text-sm text-stone-500">Fabric inventory</span>
          </div>
          <nav className="flex flex-1 items-center gap-1" aria-label="Main">
            <Link to="/" activeOptions={{ exact: true }} className={navLink} activeProps={{ className: navActive }}>
              Stock
            </Link>
            <Link to="/lots" className={navLink} activeProps={{ className: navActive }}>
              Purchases
            </Link>
            <Link to="/usage" className={navLink} activeProps={{ className: navActive }}>
              Usage
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-500 sm:inline">{emailToUsername(session.user.email)}</span>
            <button type="button" className={subtleButton} onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
