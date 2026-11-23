import { useState } from 'react'
import { useHistory, type AuditEntry } from '../lib/queries'
import { qty, rupees, shortDate } from '../lib/format'
import { emailToUsername } from '../lib/username'
import { Badge, Card, EmptyState, ErrorNote, Loading, PageHeader, filterClass, subtleButton } from '../components/ui'

type Kind = 'text' | 'qty' | 'rupee' | 'date' | 'num' | 'unit'

interface TableInfo {
  noun: string
  fields: Record<string, [label: string, kind: Kind]>
}

// Which fields to show for each kind of record, and how to show them.
// Anything not listed here (ids, timestamps, who created it) is left out.
const TABLES: Record<string, TableInfo> = {
  fabric_lots: {
    noun: 'Fabric',
    fields: {
      fabric_name: ['Name', 'text'],
      color: ['Colour', 'text'],
      supplier: ['Supplier', 'text'],
      purchase_date: ['Purchase date', 'date'],
      meters_bought: ['Bought', 'qty'],
      rate_per_meter: ['Rate', 'rupee'],
      unit: ['Counted in', 'unit'],
      width_inches: ['Width (in)', 'num'],
      low_stock_meters: ['Low stock alert', 'qty'],
      purpose: ['Purpose', 'text'],
      notes: ['Notes', 'text'],
    },
  },
  fabric_stock_in: {
    noun: 'Stock in',
    fields: {
      entry_date: ['Date', 'date'],
      meters: ['Quantity', 'qty'],
      rate_per_meter: ['Rate', 'rupee'],
      supplier: ['Supplier', 'text'],
      purpose: ['Purpose', 'text'],
      notes: ['Notes', 'text'],
    },
  },
  fabric_usage: {
    noun: 'Stock out',
    fields: {
      usage_date: ['Date', 'date'],
      usage_type: ['Type', 'text'],
      design_code: ['Design', 'text'],
      meters_used: ['Used', 'qty'],
      wastage_meters: ['Wastage', 'qty'],
      notes: ['Notes', 'text'],
    },
  },
  drops: { noun: 'Drop', fields: { name: ['Name', 'text'] } },
  suppliers: {
    noun: 'Supplier',
    fields: {
      name: ['Name', 'text'],
      phone: ['Phone', 'text'],
      location: ['Location', 'text'],
      website: ['Website', 'text'],
      notes: ['Notes', 'text'],
    },
  },
  fabric_types: { noun: 'Fabric type', fields: { name: ['Name', 'text'] } },
  patterns: {
    noun: 'Pattern',
    fields: {
      pattern_no: ['Pattern no', 'text'],
      fabric_usage_m: ['Fabric usage (m)', 'num'],
      lining_usage_m: ['Lining usage (m)', 'num'],
      notes: ['Notes', 'text'],
    },
  },
  drop_styles: {
    noun: 'Style',
    fields: {
      width_inches: ['Width (in)', 'num'],
      fabric_usage_m: ['Fabric usage (m)', 'num'],
      fabric_rate: ['Fabric rate', 'rupee'],
      lining_usage_m: ['Lining usage (m)', 'num'],
      lining_rate: ['Lining rate', 'rupee'],
      stitching: ['Stitching', 'rupee'],
      misc: ['Misc', 'rupee'],
      profit: ['Profit', 'rupee'],
      gst: ['GST', 'num'],
      shipping: ['Shipping', 'rupee'],
      planned_qty: ['Planned pieces', 'num'],
      final_price: ['Final price', 'rupee'],
      notes: ['Notes', 'text'],
    },
  },
}

const AREAS: { value: string; label: string; tables: string[] | null }[] = [
  { value: 'all', label: 'Everything', tables: null },
  { value: 'stock', label: 'Stock in and out', tables: ['fabric_stock_in', 'fabric_usage'] },
  { value: 'fabric', label: 'Fabrics and items', tables: ['fabric_lots'] },
  { value: 'drops', label: 'Drops and styles', tables: ['drops', 'drop_styles'] },
  { value: 'patterns', label: 'Patterns', tables: ['patterns'] },
  { value: 'other', label: 'Suppliers and fabric types', tables: ['suppliers', 'fabric_types'] },
]

const ACTIONS: Record<AuditEntry['action'], { verb: string; tone: 'green' | 'amber' | 'red' }> = {
  insert: { verb: 'Added', tone: 'green' },
  update: { verb: 'Edited', tone: 'amber' },
  delete: { verb: 'Deleted', tone: 'red' },
}

function show(value: unknown, kind: Kind, unit: AuditEntry['unit']): string {
  if (value === null || value === undefined || value === '') return 'empty'
  switch (kind) {
    case 'qty':
      return qty(value as number, unit)
    case 'rupee':
      return rupees(value as number)
    case 'date':
      return shortDate(String(value))
    case 'unit':
      return value === 'pcs' ? 'Pieces' : 'Meters'
    case 'num':
      return String(Number(value))
    default:
      return String(value)
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if ((a ?? null) === (b ?? null)) return true
  if (a === '' && b == null) return true
  if (b === '' && a == null) return true
  if (typeof a === 'number' || typeof b === 'number' || (typeof a === 'string' && typeof b === 'string' && a !== '' && !isNaN(Number(a)) && !isNaN(Number(b)))) {
    return Number(a) === Number(b)
  }
  return false
}

interface Line {
  label: string
  from?: string
  to?: string
  value?: string
}

function lines(e: AuditEntry): Line[] {
  const info = TABLES[e.table_name]
  if (!info) return []
  const out: Line[] = []
  if (e.action === 'update') {
    for (const [key, [label, kind]] of Object.entries(info.fields)) {
      const a = e.old_data?.[key]
      const b = e.new_data?.[key]
      if (!sameValue(a, b)) out.push({ label, from: show(a, kind, e.unit), to: show(b, kind, e.unit) })
    }
    return out
  }
  const row = (e.action === 'insert' ? e.new_data : e.old_data) ?? {}
  for (const [key, [label, kind]] of Object.entries(info.fields)) {
    const v = row[key]
    if (v === null || v === undefined || v === '') continue
    if (key === 'unit' && v === 'm') continue
    out.push({ label, value: show(v, kind, e.unit) })
  }
  return out
}

const IST = 'Asia/Kolkata'

function dayKey(at: string): string {
  return new Date(at).toLocaleDateString('en-CA', { timeZone: IST })
}

function dayLabel(at: string): string {
  const key = dayKey(at)
  const today = dayKey(new Date().toISOString())
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString())
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  return new Date(at).toLocaleDateString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' })
}

function timeLabel(at: string): string {
  return new Date(at).toLocaleTimeString('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true })
}

function Entry({ e }: { e: AuditEntry }) {
  const info = TABLES[e.table_name]
  const act = ACTIONS[e.action]
  const detail = lines(e)
  const who = e.user_email ? emailToUsername(e.user_email) : 'System'
  return (
    <li className="rounded-2xl border border-stone-200/80 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <Badge tone={act.tone}>{act.verb}</Badge>
          <span className="text-sm font-medium text-stone-600">{info?.noun ?? e.table_name}</span>
        </div>
        <p className="text-xs text-stone-500">
          {timeLabel(e.at)} · {who}
        </p>
      </div>
      {e.label ? <p className="mt-2 font-display text-base font-semibold text-ink">{e.label}</p> : null}
      {detail.length ? (
        <dl className="mt-2 space-y-1 text-sm">
          {detail.map((l) => (
            <div key={l.label} className="flex flex-wrap gap-x-2">
              <dt className="text-stone-500">{l.label}</dt>
              {l.value !== undefined ? (
                <dd className="font-medium text-ink">{l.value}</dd>
              ) : (
                <dd className="font-medium text-ink">
                  <span className="text-stone-500 line-through decoration-stone-300">{l.from}</span>
                  <span className="mx-1.5 text-stone-400">to</span>
                  {l.to}
                </dd>
              )}
            </div>
          ))}
        </dl>
      ) : e.action === 'update' ? (
        <p className="mt-2 text-sm text-stone-500">Details not shown for this change.</p>
      ) : null}
    </li>
  )
}

const PAGE = 50

export function HistoryPage() {
  const [area, setArea] = useState('all')
  const [action, setAction] = useState('all')
  const [limit, setLimit] = useState(PAGE)
  const tables = AREAS.find((a) => a.value === area)?.tables ?? null
  const { data, isLoading, error, isFetching } = useHistory({
    tables,
    action: action === 'all' ? null : action,
    limit,
  })
  const rows = data ?? []

  const groups: { key: string; label: string; items: AuditEntry[] }[] = []
  for (const r of rows) {
    const key = dayKey(r.at)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(r)
    else groups.push({ key, label: dayLabel(r.at), items: [r] })
  }

  return (
    <>
      <PageHeader
        title="History"
        subtitle="Every add, edit and delete, with who did it and when. It starts from the day this was switched on, and it cannot be changed."
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <select
          className={filterClass}
          value={area}
          onChange={(e) => {
            setArea(e.target.value)
            setLimit(PAGE)
          }}
          aria-label="Show"
        >
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <select
          className={filterClass}
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setLimit(PAGE)
          }}
          aria-label="Type of change"
        >
          <option value="all">All changes</option>
          <option value="insert">Added</option>
          <option value="update">Edited</option>
          <option value="delete">Deleted</option>
        </select>
      </div>

      {isLoading ? (
        <Loading label="Loading history" />
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="Nothing here yet" body="Changes made from now on will show up here." />
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{g.label}</h2>
              <ul className="space-y-3">
                {g.items.map((e) => (
                  <Entry key={e.id} e={e} />
                ))}
              </ul>
            </section>
          ))}
          {rows.length >= limit ? (
            <div className="text-center">
              <button type="button" className={subtleButton} disabled={isFetching} onClick={() => setLimit(limit + PAGE)}>
                {isFetching ? 'Loading' : 'Show older changes'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}
