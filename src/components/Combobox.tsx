import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface Option {
  value: string
  label: string
  hint?: string
  /** Picture shown beside the label. Pass null for options without one. */
  image?: string | null
}

function Pic({ src, className }: { src?: string | null; className: string }) {
  return src ? (
    <img src={src} alt="" className={`${className} shrink-0 rounded-md object-cover`} />
  ) : (
    <span className={`${className} shrink-0 rounded-md bg-maroon-50`} />
  )
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
  onCreate,
  createLabel = 'Add new',
}: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
  ariaLabel?: string
  onCreate?: (name: string) => void
  createLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [sheet, setSheet] = useState(false)
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
    setSheet(window.matchMedia('(max-width: 767px)').matches)
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const trimmed = query.trim()
  const canCreate =
    !!onCreate && !options.some((o) => o.label.trim().toLowerCase() === trimmed.toLowerCase())
  const createText = trimmed ? `${createLabel} "${trimmed}"` : createLabel
  const total = filtered.length + (canCreate ? 1 : 0)

  function create() {
    if (!onCreate) return
    const name = trimmed
    if (!name) {
      // Nothing typed yet: put the cursor back in the search box so the name can be typed.
      document.getElementById('combobox-search')?.focus()
      return
    }
    onCreate(name)
    close()
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
      // Keep the list attached to its button. Closing here made it vanish on phones,
      // where opening the list can scroll or resize the page.
      const r = buttonRef.current?.getBoundingClientRect()
      if (r) setRect({ left: r.left, top: r.bottom + 6, width: Math.max(r.width, 220) })
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
      setActive((a) => Math.min(total - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= filtered.length) create()
      else if (filtered[active]) pick(filtered[active])
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
        <span className={`flex min-w-0 items-center gap-2.5 ${selected ? '' : 'text-stone-400'}`}>
          {selected && selected.image !== undefined ? <Pic src={selected.image} className="h-9 w-7" /> : null}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-stone-400" fill="currentColor" aria-hidden="true">
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </button>
      {open && rect
        ? createPortal(
            <>
            {sheet ? <div className="fixed inset-0 z-[69] bg-black/40" aria-hidden="true" /> : null}
            <div
              ref={popRef}
              style={sheet ? undefined : { position: 'fixed', left: rect.left, top: rect.top, width: rect.width }}
              className={
                sheet
                  ? 'fixed inset-x-0 bottom-0 z-[70] overflow-hidden rounded-t-3xl bg-white pb-6 shadow-2xl'
                  : 'z-[70] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl'
              }
            >
              {sheet ? <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-stone-300" /> : null}
              <div className="border-b border-stone-100 p-2">
                <input
                  autoFocus={typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches}
                  id="combobox-search"
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
              <ul ref={listRef} role="listbox" className={`${sheet ? 'max-h-[50vh]' : 'max-h-64'} overflow-y-auto p-1`}>
                {filtered.length === 0 && !canCreate ? (
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
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 ${sheet ? 'py-3' : 'py-2'} text-sm ${
                        i === active ? 'bg-maroon-50 text-maroon-900' : 'text-ink'
                      } ${o.value === value ? 'font-semibold' : ''}`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {o.image !== undefined ? <Pic src={o.image} className="h-12 w-9" /> : null}
                        <span className="truncate">{o.label}</span>
                      </span>
                      {o.hint ? <span className="shrink-0 text-xs text-stone-500">{o.hint}</span> : null}
                    </li>
                  ))
                )}
                {canCreate ? (
                  <li
                    role="option"
                    aria-selected={false}
                    onMouseEnter={() => setActive(filtered.length)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={create}
                    className={`mt-1 flex cursor-pointer items-center gap-2 rounded-lg border-t border-stone-100 px-3 py-2 text-sm font-semibold text-maroon-900 ${
                      active === filtered.length ? 'bg-maroon-50' : ''
                    }`}
                  >
                    <span aria-hidden="true">+</span>
                    <span className="truncate">{createText}</span>
                  </li>
                ) : null}
              </ul>
            </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
