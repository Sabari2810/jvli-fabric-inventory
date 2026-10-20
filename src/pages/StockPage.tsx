import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useCanEdit, useDeleteFabric, useDrops, useFabricTypes, useStock } from '../lib/queries'
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
  IconButton,
  Th,
  Thumb,
  filterClass,
  linkButton,
  primaryButton,
  subtleButton,
} from '../components/ui'

type PurposeFilter = 'all' | 'sample' | 'production'
type SortKey = 'recent' | 'name' | 'left_desc' | 'left_asc'

const sortOptions = [
  { value: 'recent', label: 'Default order' },
  { value: 'name', label: 'Name A to Z' },
  { value: 'left_desc', label: 'Most left' },
  { value: 'left_asc', label: 'Least left' },
]


export function StockPage() {
  const { data, isLoading, error } = useStock()
  const drops = useDrops()
  const [search, setSearch] = useState('')
  const [purpose, setPurpose] = useState<PurposeFilter>('all')
  const [dropId, setDropId] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState({ drop: 'all', type: 'all', purpose: 'all' as PurposeFilter })
  const fabricTypes = useFabricTypes()
  const typeName = (id: string | null | undefined) => fabricTypes.data?.find((t) => t.id === id)?.name
  const deleteFabric = useDeleteFabric()
  const canEdit = useCanEdit()
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
    const list = rows.filter((r) => {
      if (purpose !== 'all' && r.purpose !== purpose) return false
      if (typeFilter !== 'all' && (typeFilter === 'none' ? r.fabric_type_id : r.fabric_type_id !== typeFilter)) return false
      if (!q) return true
      return [r.fabric_name, r.color, r.supplier, typeName(r.fabric_type_id)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
    if (sort === 'name') list.sort((a, b) => a.fabric_name.localeCompare(b.fabric_name))
    else if (sort === 'left_desc') list.sort((a, b) => Number(b.meters_left) - Number(a.meters_left))
    else if (sort === 'left_asc') list.sort((a, b) => Number(a.meters_left) - Number(b.meters_left))
    return list
  }, [rows, search, purpose, typeFilter, sort, fabricTypes.data])

  const purposeLabel = (p: PurposeFilter) =>
    p === 'sample' ? 'Bought for samples' : p === 'production' ? 'Bought for production' : 'All purposes'
  const chips = [
    dropId !== 'all' ? { key: 'drop', label: dropId === 'none' ? 'No drop' : dropName(dropId) ?? 'Drop', clear: () => setDropId('all') } : null,
    typeFilter !== 'all' ? { key: 'type', label: typeFilter === 'none' ? 'No type' : typeName(typeFilter) ?? 'Type', clear: () => setTypeFilter('all') } : null,
    purpose !== 'all' ? { key: 'purpose', label: purposeLabel(purpose), clear: () => setPurpose('all') } : null,
  ].filter((c): c is { key: string; label: string; clear: () => void } => c !== null)

  function openSheet() {
    setDraft({ drop: dropId, type: typeFilter, purpose })
    setSheetOpen(true)
  }
  function applySheet() {
    setDropId(draft.drop)
    setTypeFilter(draft.type)
    setPurpose(draft.purpose)
    setSheetOpen(false)
  }
  function clearAll() {
    setDropId('all')
    setTypeFilter('all')
    setPurpose('all')
  }

  const dropOptions = [
    { value: 'all', label: 'All drops' },
    ...(drops.data ?? []).map((d) => ({ value: d.id, label: d.name })),
    { value: 'none', label: 'No drop' },
  ]
  const typeOptions = [
    { value: 'all', label: 'All fabric types' },
    ...(fabricTypes.data ?? []).map((t) => ({ value: t.id, label: t.name })),
    { value: 'none', label: 'No type' },
  ]
  const purposeOptions = [
    { value: 'all', label: 'All purposes' },
    { value: 'sample', label: 'Bought for samples' },
    { value: 'production', label: 'Bought for production' },
  ]

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
          canEdit ? (
          <div className="flex gap-3">
            <button type="button" className={subtleButton} onClick={() => setStockInFor(null)}>
              Stock in
            </button>
            <button type="button" className={primaryButton} onClick={() => openFabric(null)}>
              <Icon name="plus" className="h-4 w-4" />
              Add fabric
            </button>
          </div>
          ) : undefined
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

      {/* Phone: search, a Filters sheet, sort and removable chips */}
      <div className="mb-5 space-y-3 md:hidden">
        <input
          type="search"
          placeholder="Search fabric, color or supplier"
          className={`${filterClass} w-full`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={openSheet}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              chips.length ? 'bg-maroon-100 text-maroon-900' : 'bg-maroon-50 text-maroon-900'
            }`}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M3 5h14M6 10h8M9 15h2" />
            </svg>
            Filters{chips.length ? ` \u00b7 ${chips.length}` : ''}
          </button>
          <Combobox value={sort} onChange={(v) => setSort(v as SortKey)} options={sortOptions} ariaLabel="Sort" />
        </div>
        {chips.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.clear}
                className="flex items-center gap-1.5 rounded-full bg-maroon-50 px-3 py-1.5 text-xs font-semibold text-maroon-900"
              >
                {c.label}
                <Icon name="close" className="h-3 w-3" />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="ml-auto text-xs font-semibold text-maroon-900">
              Clear all
            </button>
          </div>
        ) : null}
        <p className="text-sm font-semibold text-ink">
          {filtered.length} {filtered.length === 1 ? 'fabric' : 'fabrics'}
        </p>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/50"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-5 pb-8 pt-3 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-300" />
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-ink">Filters</h2>
              <button
                type="button"
                className="text-sm font-semibold text-maroon-900"
                onClick={() => setDraft({ drop: 'all', type: 'all', purpose: 'all' })}
              >
                Clear all
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Drop</span>
                <Combobox value={draft.drop} onChange={(v) => setDraft((d) => ({ ...d, drop: v }))} options={dropOptions} ariaLabel="Drop" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Fabric type</span>
                <Combobox value={draft.type} onChange={(v) => setDraft((d) => ({ ...d, type: v }))} options={typeOptions} ariaLabel="Fabric type" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Purpose</span>
                <Combobox
                  value={draft.purpose}
                  onChange={(v) => setDraft((d) => ({ ...d, purpose: v as PurposeFilter }))}
                  options={purposeOptions}
                  ariaLabel="Purpose"
                />
              </label>
            </div>
            <button type="button" className={`${primaryButton} mt-6 w-full justify-center`} onClick={applySheet}>
              Apply filters
            </button>
            <button type="button" className={`${subtleButton} mt-3 w-full justify-center`} onClick={() => setSheetOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Tablet and desktop: inline filters */}
      <div className="mb-6 hidden flex-wrap items-center gap-3 md:flex">
        <input
          type="search"
          placeholder="Search fabric, color or supplier"
          className={`${filterClass} w-72`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Combobox className="w-48" value={dropId} onChange={setDropId} ariaLabel="Filter by drop" options={dropOptions} />
        <Combobox className="w-48" value={typeFilter} onChange={setTypeFilter} ariaLabel="Filter by fabric type" options={typeOptions} />
        <Combobox
          className="w-52"
          value={purpose}
          onChange={(v) => setPurpose(v as PurposeFilter)}
          ariaLabel="Filter by purpose"
          options={purposeOptions}
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
              allRows.length === 0 && canEdit ? (
                <button type="button" className={primaryButton} onClick={() => openFabric(null)}>
                  Add fabric
                </button>
              ) : undefined
            }
          />
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <>
        <ul className="space-y-3 md:hidden">
          {filtered.map((r) => {
            const left = Number(r.meters_left)
            const drop = dropName(r.drop_id)
            const sub = [typeName(r.fabric_type_id), r.width_inches ? `${r.width_inches} in` : null, r.color]
              .filter(Boolean)
              .join(', ')
            return (
              <li key={r.id} className="rounded-2xl border border-stone-200/80 bg-white p-4">
                <div className="flex gap-3">
                  <Thumb src={r.image_data} name={r.fabric_name} className="h-20 w-20" />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/fabric/$fabricId"
                      params={{ fabricId: r.id }}
                      className="block font-semibold leading-snug text-ink hover:text-maroon-900"
                    >
                      {r.fabric_name}
                    </Link>
                    <p className="mt-0.5 text-xs text-stone-500">{sub || 'No color'}</p>
                    {drop ? (
                      <div className="mt-2">
                        <Badge tone="maroon">{drop}</Badge>
                      </div>
                    ) : null}
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-stone-200/80 text-center">
                  <div className="bg-stone-50 py-2.5">
                    <dt className="text-xs text-stone-500">Stock in</dt>
                    <dd className="whitespace-nowrap text-sm font-semibold tabular-nums">{plain(r.meters_bought)} m</dd>
                  </div>
                  <div className="bg-stone-50 py-2.5">
                    <dt className="text-xs text-stone-500">Wastage</dt>
                    <dd className="whitespace-nowrap text-sm font-semibold tabular-nums">{plain(r.meters_wastage)} m</dd>
                  </div>
                  <div className="bg-maroon-50 py-2.5">
                    <dt className="text-xs text-maroon-900/70">Left</dt>
                    <dd className="whitespace-nowrap text-sm font-semibold tabular-nums text-maroon-900">{plain(left)} m</dd>
                  </div>
                </dl>
                {canEdit ? (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-4">
                      <button type="button" className={linkButton} onClick={() => setStockInFor(r.id)}>
                        Stock in
                      </button>
                      <Link to="/out" search={{ lot: r.id }} className={linkButton}>
                        Stock out
                      </Link>
                    </div>
                    <div className="flex">
                      <IconButton icon="edit" label="Edit fabric" onClick={() => openFabric(r)} />
                      <IconButton icon="trash" label="Delete fabric" danger onClick={() => onDelete(r)} />
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
        <Card className="hidden md:block">
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
                          {[typeName(r.fabric_type_id), r.width_inches ? `${r.width_inches} in` : null, r.color].filter(Boolean).join(', ') || 'No color'}
                        </p>
                      </Td>
                      <Td>{drop ? <Badge tone="maroon">{drop}</Badge> : <span className="text-stone-400">-</span>}</Td>
                      <Td align="right">{plain(r.meters_bought)} m</Td>
                      <Td align="right">{plain(r.meters_wastage)} m</Td>
                      <Td align="right" className="font-semibold">
                        {plain(left)} m
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        {canEdit ? (
                          <>
                        <button type="button" className={`${linkButton} mr-4`} onClick={() => setStockInFor(r.id)}>
                          Stock in
                        </button>
                        <Link to="/out" search={{ lot: r.id }} className={`${linkButton} mr-4`}>
                          Stock out
                        </Link>
                        <IconButton icon="edit" label="Edit fabric" onClick={() => openFabric(r)} />
                        <IconButton icon="trash" label="Delete fabric" danger onClick={() => onDelete(r)} />
                          </>
                        ) : null}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      ) : null}
      {deleteFabric.error ? <div className="mt-4"><ErrorNote message={deleteFabric.error.message} /></div> : null}

      {canEdit ? (
        <>
      <FabricDrawer open={fabricOpen} fabric={editFabric} onClose={() => setFabricOpen(false)} />
      <StockInDrawer
        open={stockInFor !== undefined}
        entry={null}
        fabricId={stockInFor ?? undefined}
        onClose={() => setStockInFor(undefined)}
      />
        </>
      ) : null}
    </>
  )
}
