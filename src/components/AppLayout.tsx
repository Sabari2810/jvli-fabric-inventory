import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useRouterState } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'
import { emailToUsername } from '../lib/username'
import { Icon, Loading } from './ui'

const items = [
  { to: '/', label: 'Stock', icon: 'stock', exact: true },
  { to: '/in', label: 'Stock in', icon: 'purchase', exact: false },
  { to: '/out', label: 'Stock out', icon: 'cut', exact: false },
  { to: '/drops', label: 'Drops', icon: 'drop', exact: false },
  { to: '/patterns', label: 'Patterns', icon: 'scissors', exact: false },
  { to: '/fabric-types', label: 'Fabric types', icon: 'swatch', exact: false },
  { to: '/suppliers', label: 'Suppliers', icon: 'people', exact: false },
  { to: '/contacts', label: 'Contacts', icon: 'contact', exact: false },
  { to: '/history', label: 'History', icon: 'history', exact: false },
] as const

// On phones the bottom bar keeps the four everyday pages and the rest live in a Menu.
const mainTabs = items.slice(0, 4)
const moreTabs = items.slice(4)

const sideLink =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-maroon-100/80 transition hover:bg-white/10 hover:text-white'
const sideActive = '!bg-white !text-maroon-900'

const tabLink =
  'flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-xs font-medium text-stone-500 transition'
const tabActive = '!text-maroon-900'

export function AppLayout() {
  const { session, loading, signOut } = useAuth()
  const pathname = useRouterState({ select: (st) => st.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the menu whenever the page changes, and on Escape.
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])
  const inMenu = moreTabs.some((i) => pathname.startsWith(i.to))

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

      {/* Mobile bottom tabs: four everyday pages and a Menu for the rest */}
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-20 bg-ink/30 lg:hidden"
        />
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white lg:hidden" aria-label="Main">
        {menuOpen ? (
          <div
            id="more-menu"
            className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl"
          >
            {moreTabs.map((i) => (
              <Link
                key={i.to}
                to={i.to}
                activeOptions={{ exact: i.exact }}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium text-stone-700 transition active:bg-stone-100"
                activeProps={{ className: 'bg-maroon-50 !text-maroon-900' }}
              >
                <Icon name={i.icon} />
                {i.label}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="flex">
          {mainTabs.map((i) => (
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
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="more-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className={`${tabLink} ${menuOpen || inMenu ? tabActive : ''}`}
          >
            <Icon name="more" />
            Menu
          </button>
        </div>
      </nav>
    </div>
  )
}
