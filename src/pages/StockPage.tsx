import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useStock } from '../lib/queries'
import { meters, plain, rupees, shortDate } from '../lib/format'
import {
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Stat,
  Td,
  Th,
  inputClass,
  primaryButton,
} from '../components/ui'

type PurposeFilter = 'all' | 'sample' | 'production'

export function StockPage() {
  const { data, isLoading, error } = useStock()
  const [search, setSearch] = useState('')
  const [purpose, setPurpose] = useState<PurposeFilter>('all')
  const [lowOnly, setLowOnly] = useState(false)

  const rows = data ?? []

  const totals = useMemo(() => {
    let bought = 0
    let sample = 0
    let actual = 0
    let wastage = 0
    let left = 0
    let value = 0
    for (const r of rows) {
      bought += Number(r.meters_bought)
      sample += Number(r.meters_sample)
      actual += Number(r.meters_actual)
      wastage += Number(r.meters_wastage)
      left += Number(r.meters_left)
      value += Number(r.meters_left) * Number(r.rate_per_meter)
    }
    return { bought, sample, actual, wastage, left, value }
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

  return (
    <>
      <PageHeader
        title="Fabric stock"
        subtitle="Meters bought, used and left for every fabric you bought."
        action={
          <Link to="/lots" className={primaryButton}>
            Add fabric purchase
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Bought" value={meters(totals.bought)} sub={`${rows.length} purchases`} />
        <Stat label="Used for samples" value={meters(totals.sample)} />
        <Stat label="Used for kurtis" value={meters(totals.actual)} />
        <Stat label="Wastage" value={meters(totals.wastage)} />
        <Stat label="Left" value={meters(totals.left)} />
        <Stat label="Stock value" value={rupees(totals.value)} sub="Left x rate" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-4">
          <input
            type="search"
            placeholder="Search fabric, color or supplier"
            className={`${inputClass} max-w-xs`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-maroon-900 focus:ring-maroon-700"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
            />
            Low stock only
          </label>
        </div>

        {isLoading ? <Loading /> : null}
        {error ? (
          <div className="p-4">
            <ErrorNote message={error.message} />
          </div>
        ) : null}

        {!isLoading && !error && filtered.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? 'No fabric recorded yet' : 'Nothing matches these filters'}
            body={
              rows.length === 0
                ? 'Add your first purchase to start tracking meters.'
                : 'Try clearing the search or filters.'
            }
          />
        ) : null}

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <Th />
                  <Th>Fabric</Th>
                  <Th>Supplier</Th>
                  <Th>Purpose</Th>
                  <Th align="right">Bought</Th>
                  <Th align="right">Samples</Th>
                  <Th align="right">Kurtis</Th>
                  <Th align="right">Wastage</Th>
                  <Th align="right">Left</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((r) => {
                  const left = Number(r.meters_left)
                  const low = left <= Number(r.low_stock_meters)
                  const empty = left <= 0
                  return (
                    <tr key={r.id} className="hover:bg-stone-50">
                      <Td>
                        {r.image_data ? (
                          <img src={r.image_data} alt={r.fabric_name} className="h-12 w-12 rounded-lg border border-stone-200 object-cover" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg border border-dashed border-stone-200 bg-stone-50" />
                        )}
                      </Td>
                      <Td>
                        <p className="text-stone-900">{r.fabric_name}</p>
                        <p className="text-xs text-stone-500">
                          {r.color || 'No color'} | {shortDate(r.purchase_date)}
                        </p>
                      </Td>
                      <Td className="text-stone-600">{r.supplier || '-'}</Td>
                      <Td>
                        <Badge tone={r.purpose === 'sample' ? 'blue' : 'maroon'}>
                          {r.purpose === 'sample' ? 'Sample' : 'Production'}
                        </Badge>
                      </Td>
                      <Td align="right">{plain(r.meters_bought)}</Td>
                      <Td align="right">{plain(r.meters_sample)}</Td>
                      <Td align="right">{plain(r.meters_actual)}</Td>
                      <Td align="right">{plain(r.meters_wastage)}</Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-2">
                          {empty ? (
                            <Badge tone="red">Finished</Badge>
                          ) : low ? (
                            <Badge tone="amber">Low</Badge>
                          ) : null}
                          <span className="font-semibold text-stone-900">{plain(left)}</span>
                        </div>
                      </Td>
                      <Td align="right">
                        <Link
                          to="/usage"
                          search={{ lot: r.id }}
                          className="text-sm font-medium text-maroon-900 hover:underline"
                        >
                          Usage
                        </Link>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </>
  )
}
