import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useStockIn, useSuppliers } from '../lib/queries'
import { meters, rupees, shortDate } from '../lib/format'
import { Badge, Card, EmptyState, ErrorNote, Loading, MobileItem, MobileList, Stats, Td, Th, linkButton } from '../components/ui'

export function SupplierDetailPage({ supplierId }: { supplierId: string }) {
  const suppliers = useSuppliers()
  const stockIn = useStockIn()

  const supplier = (suppliers.data ?? []).find((s) => s.id === supplierId)
  const entries = useMemo(() => {
    const key = (supplier?.name ?? '').trim().toLowerCase()
    return (stockIn.data ?? []).filter((e) => key && (e.supplier ?? '').trim().toLowerCase() === key)
  }, [stockIn.data, supplier])

  const totals = useMemo(() => {
    let m = 0
    let spent = 0
    const fabrics = new Set<string>()
    for (const e of entries) {
      m += Number(e.meters)
      spent += Number(e.meters) * Number(e.rate_per_meter)
      fabrics.add(e.lot_id)
    }
    return { meters: m, spent, fabrics: fabrics.size, avg: m > 0 ? spent / m : 0 }
  }, [entries])

  if (suppliers.isLoading || stockIn.isLoading) return <Loading />
  if (suppliers.error) return <ErrorNote message={suppliers.error.message} />

  if (!supplier) {
    return (
      <Card>
        <EmptyState
          title="Supplier not found"
          body="It may have been deleted."
          action={
            <Link to="/suppliers" className={linkButton}>
              Back to suppliers
            </Link>
          }
        />
      </Card>
    )
  }

  const figures = [
    { label: 'Entries', value: String(entries.length) },
    { label: 'Fabrics', value: String(totals.fabrics) },
    { label: 'Meters bought', value: meters(totals.meters) },
    { label: 'Total spent', value: rupees(totals.spent) },
    { label: 'Average rate', value: rupees(totals.avg) },
  ]

  return (
    <>
      <Link to="/suppliers" className="mb-6 inline-block text-sm text-stone-500 hover:text-ink">
        Back to suppliers
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{supplier.name}</h1>
      <p className="mt-1.5 text-[15px] text-stone-500">
        {[supplier.phone, supplier.location].filter(Boolean).join(', ') || 'No contact details yet'}
      </p>
      {supplier.website ? (
        <a
          href={supplier.website}
          target="_blank"
          rel="noreferrer"
          className={`${linkButton} mt-2 inline-block`}
        >
          {supplier.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
        </a>
      ) : null}
      {supplier.notes ? <p className="mt-2 max-w-xl text-sm text-stone-600">{supplier.notes}</p> : null}

      <dl className="my-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-200/80 sm:grid-cols-3 lg:grid-cols-5">
        {figures.map((f) => (
          <div key={f.label} className="bg-white p-5">
            <dt className="text-sm text-stone-500">{f.label}</dt>
            <dd className="mt-1 whitespace-nowrap font-display text-xl font-semibold tabular-nums text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 font-display text-xl font-semibold text-ink">Stock in from this supplier</h2>
      {entries.length > 0 ? (
        <MobileList>
          {entries.map((e) => (
            <MobileItem key={e.id}>
              <Link
                to="/fabric/$fabricId"
                params={{ fabricId: e.lot_id }}
                className="font-semibold leading-snug text-ink hover:text-maroon-900"
              >
                {e.fabric_lots?.fabric_name ?? '-'}
              </Link>
              <p className="mt-0.5 text-xs text-stone-500">{shortDate(e.entry_date)}</p>
              <div className="mt-2">
                <Badge tone={e.purpose === 'sample' ? 'blue' : 'maroon'}>
                  {e.purpose === 'sample' ? 'Sample' : 'Production'}
                </Badge>
              </div>
              <Stats
                items={[
                  { label: 'Meters', value: meters(e.meters) },
                  { label: 'Rate', value: rupees(e.rate_per_meter) },
                  { label: 'Total', value: rupees(Number(e.meters) * Number(e.rate_per_meter)), strong: true },
                ]}
              />
            </MobileItem>
          ))}
        </MobileList>
      ) : null}

      <Card className={entries.length > 0 ? 'hidden md:block' : ''}>
        {entries.length === 0 ? (
          <EmptyState title="Nothing bought yet" body="Stock in entries that name this supplier will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Fabric</Th>
                  <Th>Bought for</Th>
                  <Th align="right">Meters</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <Td className="whitespace-nowrap text-stone-600">{shortDate(e.entry_date)}</Td>
                    <Td>
                      <Link
                        to="/fabric/$fabricId"
                        params={{ fabricId: e.lot_id }}
                        className="font-semibold text-ink underline-offset-4 hover:text-maroon-900 hover:underline"
                      >
                        {e.fabric_lots?.fabric_name ?? '-'}
                      </Link>
                      <p className="text-xs text-stone-500">{e.fabric_lots?.color || 'No color'}</p>
                    </Td>
                    <Td>
                      <Badge tone={e.purpose === 'sample' ? 'blue' : 'maroon'}>
                        {e.purpose === 'sample' ? 'Sample' : 'Production'}
                      </Badge>
                    </Td>
                    <Td align="right">{meters(e.meters)}</Td>
                    <Td align="right">{rupees(e.rate_per_meter)}</Td>
                    <Td align="right" className="font-semibold">
                      {rupees(Number(e.meters) * Number(e.rate_per_meter))}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
