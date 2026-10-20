import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useDrops, useStock } from '../lib/queries'
import { meters, plain, rupees, shortDate } from '../lib/format'
import {
  Badge,
  EmptyState,
  ErrorNote,
  Icon,
  Loading,
  PageHeader,
  TapeBar,
  Thumb,
  inputClass,
  linkButton,
  primaryButton,
} from '../components/ui'

type PurposeFilter = 'all' | 'sample' | 'production'

export function StockPage() {
  const { data, isLoading, error } = useStock()
  const drops = useDrops()
  const [search, setSearch] = useState('')
  const [purpose, setPurpose] = useState<PurposeFilter>('all')
  const [lowOnly, setLowOnly] = useState(false)
  const [dropId, setDropId] = useState('all')

  const dropName = (id: string | null | undefined) => drops.data?.find((d) => d.id === id)?.name

  const allRows = data ?? []
  const rows = useMemo(
    () =>
      (data ?? []).filter((r) =>
        dropId === 'all' ? true : dropId === 'none' ? !r.drop_id : r.drop_id === dropId,
      ),
    [data, dropId],
  )

  const totals = useMemo(() => {
    const t = { bought: 0, sample: 0, actual: 0, wastage: 0, left: 0, value: 0 }
    for (const r of rows) {
      t.bought += Number(r.meters_bought)
      t.sample += Number(r.meters_sample)
      t.actual += Number(r.meters_actual)
      t.wastage += Number(r.meters_wastage)
      t.left += Number(r.meters_left)
      t.value += Number(r.meters_left) * Number(r.rate_per_meter)
    }
    return t
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (purpose !== 'all' && r.purpose !== purpose) return false
      if (lowOnly && Number(r.meters_left) > Number(r.low_stock_meters)) return false
      if (!q) return true
      return [r.fabric_name, r.color, r.supplier]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [rows, search, purpose, lowOnly])

  const summary = [
    { label: 'Bought', value: meters(totals.bought) },
    { label: 'Cut for samples', value: meters(totals.sample) },
    { label: 'Cut for kurtis', value: meters(totals.actual) },
    { label: 'Wastage', value: meters(totals.wastage) },
    { label: 'Stock value', value: rupees(totals.value) },
  ]

  return (
    <>
      <PageHeader
        title="Fabric stock"
        subtitle="What you bought, what has been cut, and what is still on the shelf."
        action={
          <Link to="/lots" className={primaryButton}>
            <Icon name="plus" className="h-4 w-4" />
            Add purchase
          </Link>
        }
      />

      <section className="mb-8 grid overflow-hidden rounded-2xl bg-maroon-900 text-white lg:grid-cols-[minmax(0,15rem)_1fr]">
        <div className="p-6 lg:p-8">
          <p className="text-sm text-maroon-200/80">Left on the shelf</p>
          <p className="mt-1 font-display text-5xl font-bold tracking-tight tabular-nums">
            {meters(totals.left)}
          </p>
          <p className="mt-1 text-sm text-maroon-200/80">across {rows.length} fabrics</p>
        </div>
        <dl className="grid grid-cols-2 border-t border-white/15 sm:grid-cols-5 lg:border-l lg:border-t-0">
          {summary.map((s, i) => (
            <div
              key={s.label}
              className={`p-5 lg:p-6 ${i > 0 ? 'sm:border-l sm:border-white/15' : ''}`}
            >
              <dt className="text-sm text-maroon-200/80">{s.label}</dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search fabric, color or supplier"
          className={`${inputClass} max-w-xs`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={`${inputClass} w-auto`}
          value={dropId}
          onChange={(e) => setDropId(e.target.value)}
          aria-label="Filter by drop"
        >
          <option value="all">All drops</option>
          {(drops.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
          <option value="none">No drop</option>
        </select>
        <select
          className={`${inputClass} w-auto`}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value as PurposeFilter)}
          aria-label="Filter by purpose"
        >
          <option value="all">All purposes</option>
          <option value="sample">Bought for samples</option>
          <option value="production">Bought for production</option>
        </select>
        <button
          type="button"
          onClick={() => setLowOnly((v) => !v)}
          aria-pressed={lowOnly}
          className={`rounded-lg border px-3.5 py-2.5 text-sm font-medium transition ${
            lowOnly
              ? 'border-maroon-900 bg-maroon-900 text-white'
              : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
          }`}
        >
          Running low
        </button>
      </div>

      {isLoading ? <Loading /> : null}
      {error ? <ErrorNote message={error.message} /> : null}

      {!isLoading && !error && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white">
          <EmptyState
            title={allRows.length === 0 ? 'No fabric recorded yet' : 'Nothing matches these filters'}
            body={
              allRows.length === 0
                ? 'Add your first purchase to start tracking meters.'
                : 'Try clearing the search or filters.'
            }
            action={
              allRows.length === 0 ? (
                <Link to="/lots" className={primaryButton}>
                  Add purchase
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => {
          const left = Number(r.meters_left)
          const low = left <= Number(r.low_stock_meters)
          const empty = left <= 0
          const tone = empty ? 'empty' : low ? 'low' : 'ok'
          const drop = dropName(r.drop_id)
          return (
            <article
              key={r.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white"
            >
              <div className="relative">
                <Thumb
                  src={r.image_data}
                  name={r.fabric_name}
                  className="aspect-[4/3] w-full !rounded-none !text-6xl"
                />
                <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                  <span>{drop ? <Badge tone="maroon">{drop}</Badge> : null}</span>
                  {empty ? <Badge tone="neutral">Finished</Badge> : low ? <Badge tone="amber">Running low</Badge> : null}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg font-semibold leading-snug text-ink">
                  {r.fabric_name}
                </h3>
                <p className="mt-0.5 text-sm text-stone-500">
                  {[r.color, r.supplier, shortDate(r.purchase_date)].filter(Boolean).join(', ')}
                </p>

                <div className="mt-5">
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="font-display text-2xl font-semibold tabular-nums text-ink">
                      {meters(left)}
                      <span className="ml-1.5 text-sm font-medium text-stone-500">left</span>
                    </p>
                    <p className="text-sm tabular-nums text-stone-500">of {meters(r.meters_bought)}</p>
                  </div>
                  <TapeBar left={left} total={Number(r.meters_bought)} tone={tone} />
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-stone-500">Samples</dt>
                    <dd className="font-semibold tabular-nums">{plain(r.meters_sample)} m</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500">Kurtis</dt>
                    <dd className="font-semibold tabular-nums">{plain(r.meters_actual)} m</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500">Wastage</dt>
                    <dd className="font-semibold tabular-nums">{plain(r.meters_wastage)} m</dd>
                  </div>
                </dl>

                <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                  <Link to="/usage" search={{ lot: r.id }} className={linkButton}>
                    Log usage
                  </Link>
                  <Link to="/lots" search={{ edit: r.id }} className="text-sm text-stone-500 hover:text-ink">
                    Edit purchase
                  </Link>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
