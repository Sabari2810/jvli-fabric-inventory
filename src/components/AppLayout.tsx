import { Link, Navigate, Outlet } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'
import { emailToUsername } from '../lib/username'
import { Icon, Loading } from './ui'

const items = [
  { to: '/', label: 'Stock', icon: 'stock', exact: true },
  { to: '/drops', label: 'Drops', icon: 'drop', exact: false },
  { to: '/in', label: 'Stock in', icon: 'purchase', exact: false },
  { to: '/out', label: 'Stock out', icon: 'cut', exact: false },
] as const

const sideLink =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-maroon-100/80 transition hover:bg-white/10 hover:text-white'
const sideActive = '!bg-white !text-maroon-900'

const tabLink =
  'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium text-stone-500 transition'
const tabActive = '!text-maroon-900'

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

  const username = emailToUsername(session.user.email)

  return (
    <div className="min-h-screen lg:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-maroon-900 px-4 py-6 lg:flex">
        <div className="px-3">
          <p className="font-display text-3xl font-bold tracking-tight text-white">JVLI</p>
          <p className="mt-0.5 text-sm text-maroon-200/80">Fabric inventory</p>
        </div>
        <nav className="mt-10 flex flex-1 flex-col gap-1" aria-label="Main">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              activeOptions={{ exact: i.exact }}
              className={sideLink}
              activeProps={{ className: sideActive }}
            >
              <Icon name={i.icon} />
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/15 px-3 pt-4">
          <p className="truncate text-sm font-medium text-white">{username}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-2 flex items-center gap-2 text-sm text-maroon-200/80 transition hover:text-white"
          >
            <Icon name="logout" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-maroon-900 px-4 py-3 lg:hidden">
        <p className="font-display text-xl font-bold tracking-tight text-white">JVLI</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-2 text-sm text-maroon-100/90"
        >
          {username}
          <Icon name="logout" className="h-4 w-4" />
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-8 lg:pb-12 lg:pt-12">
        <Outlet />
      </main>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-stone-200 bg-white lg:hidden"
        aria-label="Main"
      >
        {items.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            activeOptions={{ exact: i.exact }}
            className={tabLink}
            activeProps={{ className: tabActive }}
          >
            <Icon name={i.icon} />
            {i.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
