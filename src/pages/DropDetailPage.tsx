import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useDrops, useStock } from '../lib/queries'
import { meters, rupees } from '../lib/format'
import { StylesTab } from '../components/StylesTab'
import { Card, EmptyState, ErrorNote, Loading, Td, Th, Thumb, linkButton } from '../components/ui'

export function DropDetailPage({ dropId }: { dropId: string }) {
  const drops = useDrops()
  const [tab, setTab] = useState<'fabrics' | 'styles'>('fabrics')
  const stock = useStock()

  const fabrics = useMemo(() => (stock.data ?? []).filter((f) => f.drop_id === dropId), [stock.data, dropId])

  const t = useMemo(() => {
    const x = { bought: 0, cost: 0, sample: 0, actual: 0, wastage: 0, left: 0, value: 0 }
    for (const f of fabrics) {
      x.bought += Number(f.meters_bought)
      x.cost += Number(f.total_cost)
      x.sample += Number(f.meters_sample)
      x.actual += Number(f.meters_actual)
      x.wastage += Number(f.meters_wastage)
      x.left += Number(f.meters_left)
      x.value += Number(f.meters_left) * Number(f.rate_per_meter)
    }
    return x
  }, [fabrics])

  if (drops.isLoading || stock.isLoading) return <Loading />
  if (drops.error) return <ErrorNote message={drops.error.message} />
  if (stock.error) return <ErrorNote message={stock.error.message} />

  const drop = (drops.data ?? []).find((d) => d.id === dropId)
  if (!drop) {
    return (
      <Card>
        <EmptyState
          title="Drop not found"
          body="It may have been deleted."
          action={
            <Link to="/drops" className={linkButton}>
              Back to drops
            </Link>
          }
        />
      </Card>
    )
  }

  const figures = [
    { label: 'Fabrics', value: String(fabrics.length) },
    { label: 'Stock in', value: meters(t.bought) },
    { label: 'Out for samples', value: meters(t.sample) },
    { label: 'Out for kurtis', value: meters(t.actual) },
    { label: 'Wastage', value: meters(t.wastage) },
    { label: 'Left', value: meters(t.left) },
    { label: 'Total bought', value: rupees(t.cost) },
    { label: 'Stock value', value: rupees(t.value) },
  ]

  return (
    <>
      <Link to="/drops" className="mb-6 inline-block text-sm text-stone-500 hover:text-ink">
        Back to drops
      </Link>

      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{drop.name}</h1>
      <p className="mt-1.5 mb-8 text-[15px] text-stone-500">Totals across every fabric in this drop.</p>

      <div className="mb-6 flex gap-1 border-b border-stone-200">
        {(['fabrics', 'styles'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === k ? 'border-maroon-900 text-maroon-900' : 'border-transparent text-stone-500 hover:text-ink'
            }`}
          >
            {k === 'fabrics' ? 'Fabrics' : 'Styles'}
          </button>
        ))}
      </div>

      {tab === 'styles' ? <StylesTab dropId={dropId} /> : null}

      {tab === 'fabrics' ? (
        <>
      <section className="mb-8 grid overflow-hidden rounded-2xl bg-maroon-900 text-white lg:grid-cols-[minmax(0,15rem)_1fr]">
        <div className="p-6 lg:p-8">
          <p className="text-sm text-maroon-200/80">Left on the shelf</p>
          <p className="mt-1 whitespace-nowrap font-display text-5xl font-bold tracking-tight tabular-nums">
            {meters(t.left)}
          </p>
          <p className="mt-1 text-sm text-maroon-200/80">
            across {fabrics.length} {fabrics.length === 1 ? 'fabric' : 'fabrics'}
          </p>
        </div>
        <dl className="grid grid-cols-2 border-t border-white/15 sm:grid-cols-4 lg:border-l lg:border-t-0">
          {figures
            .filter((f) => f.label !== 'Left' && f.label !== 'Fabrics')
            .map((f, i) => (
              <div
                key={f.label}
                className={`p-5 lg:p-6 ${i % 4 !== 0 ? 'sm:border-l sm:border-white/15' : ''} ${i >= 4 ? 'sm:border-t sm:border-white/15' : ''}`}
              >
                <dt className="text-sm text-maroon-200/80">{f.label}</dt>
                <dd className="mt-1 whitespace-nowrap font-display text-xl font-semibold tabular-nums">{f.value}</dd>
              </div>
            ))}
        </dl>
      </section>

      <h2 className="mb-3 font-display text-xl font-semibold text-ink">Fabrics in this drop</h2>
      <Card>
        {fabrics.length === 0 ? (
          <EmptyState
            title="No fabrics in this drop yet"
            body="Open a fabric on the stock page, choose Edit, and pick this drop."
            action={
              <Link to="/" className={linkButton}>
                Go to stock
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead>
                <tr>
                  <Th />
                  <Th>Fabric</Th>
                  <Th align="right">Stock in</Th>
                  <Th align="right">Samples</Th>
                  <Th align="right">Kurtis</Th>
                  <Th align="right">Wastage</Th>
                  <Th align="right">Left</Th>
                  <Th align="right">Stock value</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {fabrics.map((f) => (
                  <tr key={f.id} className="transition hover:bg-stone-50/70">
                    <Td>
                      <Thumb src={f.image_data} name={f.fabric_name} />
                    </Td>
                    <Td>
                      <Link
                        to="/fabric/$fabricId"
                        params={{ fabricId: f.id }}
                        className="font-semibold text-ink underline-offset-4 hover:text-maroon-900 hover:underline"
                      >
                        {f.fabric_name}
                      </Link>
                      <p className="text-xs text-stone-500">{f.color || 'No color'}</p>
                    </Td>
                    <Td align="right">{meters(f.meters_bought)}</Td>
                    <Td align="right">{meters(f.meters_sample)}</Td>
                    <Td align="right">{meters(f.meters_actual)}</Td>
                    <Td align="right">{meters(f.meters_wastage)}</Td>
                    <Td align="right" className="font-semibold">
                      {meters(f.meters_left)}
                    </Td>
                    <Td align="right">{rupees(Number(f.meters_left) * Number(f.rate_per_meter))}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
        </>
      ) : null}
    </>
  )
}
