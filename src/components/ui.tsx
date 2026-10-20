import { useEffect, type ReactNode } from 'react'

export const inputClass =
  'block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-stone-400 transition focus:border-maroon-900 focus:outline-none focus:ring-4 focus:ring-maroon-900/10 disabled:bg-stone-100'

export const filterClass =
  'rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink transition focus:border-maroon-900 focus:outline-none focus:ring-4 focus:ring-maroon-900/10'

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-maroon-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-maroon-950 focus:outline-none focus-visible:ring-4 focus-visible:ring-maroon-900/25 disabled:cursor-not-allowed disabled:opacity-60'

export const subtleButton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/25 disabled:opacity-60'

export const linkButton =
  'text-sm font-semibold text-maroon-900 transition hover:text-maroon-950 hover:underline underline-offset-4'

export const dangerLink =
  'text-sm font-medium text-stone-400 transition hover:text-red-700 disabled:opacity-50'

/* ---------- Icons (Heroicons-style outlines) ---------- */

type IconName = 'stock' | 'purchase' | 'cut' | 'plus' | 'close' | 'image' | 'logout'

const iconPaths: Record<IconName, string> = {
  stock: 'M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5',
  purchase: 'M2.25 3h1.4l.4 2m0 0 1.6 8.2a1 1 0 0 0 1 .8h9.5a1 1 0 0 0 1-.76l1.5-6.24H4.05ZM9 19.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm8 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z',
  cut: 'M7.85 8.35 20 18.5M7.85 15.65 20 5.5M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  image: 'm3 16 5-5 4 4 3-3 6 6M3 5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25v13.5A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75Z',
  logout: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75',
}

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  )
}

/* ---------- Page chrome ---------- */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-xl text-[15px] text-stone-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-stone-200/80 bg-white ${className}`}>{children}</div>
  )
}

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg animate-drawer-in flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-ink"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </aside>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-stone-500">{hint}</span> : null}
    </label>
  )
}

export function ErrorNote({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {message}
    </div>
  )
}

type Tone = 'neutral' | 'maroon' | 'green' | 'amber' | 'red' | 'blue'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-stone-100 text-stone-700',
  maroon: 'bg-maroon-100 text-maroon-900',
  green: 'bg-emerald-50 text-emerald-800',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-50 text-red-800',
  blue: 'bg-indigo-50 text-indigo-dye',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${toneClass[tone]}`}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-stone-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-maroon-900" />
      {label}
    </div>
  )
}

export function Th({
  children,
  align = 'left',
}: {
  children?: ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold text-stone-500 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  align = 'left',
  className = '',
}: {
  children?: ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  return (
    <td
      className={`px-4 py-3.5 text-sm ${align === 'right' ? 'text-right tabular-nums' : 'text-left'} ${className}`}
    >
      {children}
    </td>
  )
}

/* ---------- Fabric visuals ---------- */

export function Thumb({
  src,
  name,
  className = 'h-12 w-12',
}: {
  src?: string | null
  name: string
  className?: string
}) {
  if (src) {
    return <img src={src} alt={name} className={`${className} shrink-0 rounded-lg object-cover`} />
  }
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-maroon-50 font-display text-lg font-semibold text-maroon-300`}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}

/** A measuring-tape bar: tick marks along a track, filled to the share of fabric left. */
export function TapeBar({ left, total, tone }: { left: number; total: number; tone: 'ok' | 'low' | 'empty' }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0
  const fill = tone === 'low' ? 'bg-saffron' : tone === 'empty' ? 'bg-stone-300' : 'bg-maroon-900'
  return (
    <div
      className="relative h-3 overflow-hidden rounded-sm bg-stone-100"
      role="img"
      aria-label={`${Math.round(pct)} percent left`}
    >
      <div className={`absolute inset-y-0 left-0 ${fill}`} style={{ width: `${pct}%` }} />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0, transparent 9px, rgba(255,255,255,0.65) 9px, rgba(255,255,255,0.65) 10px)',
        }}
      />
    </div>
  )
}
