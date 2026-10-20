import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useDeleteFabric, useDrops, useStock } from '../lib/queries'
import { Combobox } from '../components/Combobox'
import { FabricDrawer } from '../components/FabricDrawer'
import { StockInDrawer } from '../components/StockInDrawer'
import type { FabricStock } from '../lib/types'
import { meters, plain, rupees } from '../lib/format'
import {
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  Icon,
  Loading,
  PageHeader,
  Td,
  Th,
  Thumb,
  filterClass,
  dangerLink,
  linkButton,
  primaryButton,
  subtleButton,
} from '../components/ui'

type PurposeFilter = 'all' | 'sample' | 'production'

export function StockPage() {
  const { data, isLoading, error } = useStock()
  const drops = useDrops()
  const [search, setSearch] = useState('')
  const [purpose, setPurpose] = useState<PurposeFilter>('all')
  const [dropId, setDropId] = useState('all')
  const deleteFabric = useDeleteFabric()
  const [fabricOpen, setFabricOpen] = useState(false)
  const [editFabric, setEditFabric] = useState<FabricStock | null>(null)
  const [stockInFor, setStockInFor] = useState<string | null | undefined>(undefined)

  function openFabric(f: FabricStock | null) {
    setEditFabric(f)
    setFabricOpen(true)
  }

  function onDelete(f: FabricStock) {
    if (!window.confirm(`Delete ${f.fabric_name} and all its stock in entries? This cannot be undone.`)) return
    deleteFabric.mutate(f.id)
  }

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
      if (!q) return true
      return [r.fabric_name, r.color, r.supplier]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [rows, search, purpose])

  const summary = [
    { label: 'Stock in', value: meters(totals.bought) },
    { label: 'Out for samples', value: meters(totals.sample) },
    { label: 'Out for kurtis', value: meters(totals.actual) },
    { label: 'Wastage', value: meters(totals.wastage) },
    { label: 'Stock value', value: rupees(totals.value) },
  ]

  return (
    <>
      <PageHeader
        title="Fabric stock"
        subtitle="Each fabric is one record. Stock in adds meters, stock out takes them away."
        action={
          <div className="flex gap-3">
            <button type="button" className={subtleButton} onClick={() => setStockInFor(null)}>
              Stock in
            </button>
            <button type="button" className={primaryButton} onClick={() => openFabric(null)}>
              <Icon name="plus" className="h-4 w-4" />
              Add fabric
            </button>
          </div>
        }
      />

      <section className="mb-8 grid overflow-hidden rounded-2xl bg-maroon-900 text-white lg:grid-cols-[minmax(0,15rem)_1fr]">
        <div className="p-6 lg:p-8">
          <p className="text-sm text-maroon-200/80">Left on the shelf</p>
          <p className="mt-1 font-display text-5xl font-bold tracking-tight tabular-nums">
            {meters(totals.left)}
          </p>
          <p className="mt-1 text-sm text-maroon-200/80">across {rows.length} {rows.length === 1 ? 'fabric' : 'fabrics'}</p>
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
          className={`${filterClass} w-full sm:w-72`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Combobox
          className="w-48"
          value={dropId}
          onChange={setDropId}
          ariaLabel="Filter by drop"
          options={[
            { value: 'all', label: 'All drops' },
            ...(drops.data ?? []).map((d) => ({ value: d.id, label: d.name })),
            { value: 'none', label: 'No drop' },
          ]}
        />
        <Combobox
          className="w-52"
          value={purpose}
          onChange={(v) => setPurpose(v as PurposeFilter)}
          ariaLabel="Filter by purpose"
          options={[
            { value: 'all', label: 'All purposes' },
            { value: 'sample', label: 'Bought for samples' },
            { value: 'production', label: 'Bought for production' },
          ]}
        />
      </div>

      {isLoading ? <Loading /> : null}
      {error ? <ErrorNote message={error.message} /> : null}

      {!isLoading && !error && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white">
          <EmptyState
            title={allRows.length === 0 ? 'No fabric recorded yet' : 'Nothing matches these filters'}
            body={
              allRows.length === 0
                ? 'Add your first fabric, then record the meters you bought as stock in.'
                : 'Try clearing the search or filters.'
            }
            action={
              allRows.length === 0 ? (
                <button type="button" className={primaryButton} onClick={() => openFabric(null)}>
                  Add fabric
                </button>
              ) : undefined
            }
          />
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead>
                <tr>
                  <Th />
                  <Th>Fabric</Th>
                  <Th>Drop</Th>
                  <Th align="right">Stock in</Th>
                  <Th align="right">Wastage</Th>
                  <Th align="right">Left</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((r) => {
                  const left = Number(r.meters_left)
                  const drop = dropName(r.drop_id)
                  return (
                    <tr key={r.id} className="transition hover:bg-stone-50/70">
                      <Td>
                        <Thumb src={r.image_data} name={r.fabric_name} />
                      </Td>
                      <Td>
                        <Link
                          to="/fabric/$fabricId"
                          params={{ fabricId: r.id }}
                          className="font-semibold text-ink underline-offset-4 hover:text-maroon-900 hover:underline"
                        >
                          {r.fabric_name}
                        </Link>
                        <p className="text-xs text-stone-500">
                          {r.color || 'No color'}
                        </p>
                      </Td>
                      <Td>{drop ? <Badge tone="maroon">{drop}</Badge> : <span className="text-stone-400">-</span>}</Td>
                      <Td align="right">{plain(r.meters_bought)} m</Td>
                      <Td align="right">{plain(r.meters_wastage)} m</Td>
                      <Td align="right" className="font-semibold">
                        {plain(left)} m
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        <button type="button" className={`${linkButton} mr-4`} onClick={() => setStockInFor(r.id)}>
                          Stock in
                        </button>
                        <Link to="/out" search={{ lot: r.id }} className={`${linkButton} mr-4`}>
                          Stock out
                        </Link>
                        <button type="button" className="mr-4 text-sm text-stone-500 hover:text-ink" onClick={() => openFabric(r)}>
                          Edit
                        </button>
                        <button type="button" className={dangerLink} onClick={() => onDelete(r)}>
                          Delete
                        </button>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
      {deleteFabric.error ? <div className="mt-4"><ErrorNote message={deleteFabric.error.message} /></div> : null}

      <FabricDrawer open={fabricOpen} fabric={editFabric} onClose={() => setFabricOpen(false)} />
      <StockInDrawer
        open={stockInFor !== undefined}
        entry={null}
        fabricId={stockInFor ?? undefined}
        onClose={() => setStockInFor(undefined)}
      />
    </>
  )
}
