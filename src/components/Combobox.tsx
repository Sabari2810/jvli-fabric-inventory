import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface Option {
  value: string
  label: string
  hint?: string
}

const triggerBase =
  'flex items-center justify-between gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-left text-sm text-ink transition hover:border-stone-400 focus:border-maroon-900 focus:outline-none focus:ring-4 focus:ring-maroon-900/10 disabled:bg-stone-100 disabled:text-stone-500'

/** A pick list with a search box. Replaces the native select everywhere. */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Select',
  className = 'w-full',
  disabled = false,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q))
  }, [options, query])

  function openList() {
    if (disabled) return
    const r = buttonRef.current?.getBoundingClientRect()
    if (r) setRect({ left: r.left, top: r.bottom + 6, width: Math.max(r.width, 220) })
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  function pick(o: Option) {
    onChange(o.value)
    close()
  }

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (popRef.current?.contains(t) || buttonRef.current?.contains(t)) return
      setOpen(false)
    }
    function onScrollOrResize(e: Event) {
      if (popRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open])

  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(filtered.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = filtered[active]
      if (o) pick(o)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        className={`${triggerBase} ${className}`}
      >
        <span className={`truncate ${selected ? '' : 'text-stone-400'}`}>{selected ? selected.label : placeholder}</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-stone-400" fill="currentColor" aria-hidden="true">
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </button>
      {open && rect
        ? createPortal(
            <div
              ref={popRef}
              style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width }}
              className="z-[70] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl"
            >
              <div className="border-b border-stone-100 p-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActive(0)
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Search"
                  className="w-full rounded-lg bg-stone-50 px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-maroon-900/20"
                />
              </div>
              <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-stone-500">Nothing found</li>
                ) : (
                  filtered.map((o, i) => (
                    <li
                      key={o.value}
                      role="option"
                      aria-selected={o.value === value}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(o)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                        i === active ? 'bg-maroon-50 text-maroon-900' : 'text-ink'
                      } ${o.value === value ? 'font-semibold' : ''}`}
                    >
                      <span className="truncate">{o.label}</span>
                      {o.hint ? <span className="shrink-0 text-xs text-stone-500">{o.hint}</span> : null}
                    </li>
                  ))
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
