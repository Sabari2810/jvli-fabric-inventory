import { Link } from '@tanstack/react-router'
import { useDrops, useStock, useStockIn, useUsage } from '../lib/queries'
import { meters, plain, rupees, shortDate } from '../lib/format'
import {
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  Loading,
  TapeBar,
  Td,
  Th,
  Thumb,
  linkButton,
} from '../components/ui'

export function FabricDetailPage({ fabricId }: { fabricId: string }) {
  const stock = useStock()
  const stockIn = useStockIn()
  const usage = useUsage()
  const drops = useDrops()

  if (stock.isLoading) return <Loading />
  if (stock.error) return <ErrorNote message={stock.error.message} />

  const fabric = (stock.data ?? []).find((f) => f.id === fabricId)
  if (!fabric) {
    return (
      <Card>
        <EmptyState
          title="Fabric not found"
          body="It may have been deleted."
          action={
            <Link to="/" className={linkButton}>
              Back to stock
            </Link>
          }
        />
      </Card>
    )
  }

  const ins = (stockIn.data ?? []).filter((e) => e.lot_id === fabricId)
  const outs = (usage.data ?? []).filter((u) => u.lot_id === fabricId)
  const dropName = drops.data?.find((d) => d.id === fabric.drop_id)?.name
  const left = Number(fabric.meters_left)

  const figures = [
    { label: 'Stock in', value: meters(fabric.meters_bought) },
    { label: 'Out for samples', value: meters(fabric.meters_sample) },
    { label: 'Out for kurtis', value: meters(fabric.meters_actual) },
    { label: 'Wastage', value: meters(fabric.meters_wastage) },
    { label: 'Average rate', value: rupees(fabric.rate_per_meter) },
    { label: 'Stock value', value: rupees(left * Number(fabric.rate_per_meter)) },
  ]

  return (
    <>
      <Link to="/" className="mb-6 inline-block text-sm text-stone-500 hover:text-ink">
        Back to stock
      </Link>

      <div className="mb-8 flex flex-wrap items-start gap-6">
        <Thumb src={fabric.image_data} name={fabric.fabric_name} className="h-40 w-40 !rounded-2xl !text-5xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
              {fabric.fabric_name}
            </h1>
            {dropName ? <Badge tone="maroon">{dropName}</Badge> : null}
          </div>
          <p className="mt-1 text-[15px] text-stone-500">{fabric.color || 'No color'}</p>
          {fabric.notes ? <p className="mt-2 max-w-xl text-sm text-stone-600">{fabric.notes}</p> : null}

          <div className="mt-5 max-w-md">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="font-display text-3xl font-semibold tabular-nums text-ink">
                {meters(left)}
                <span className="ml-2 text-sm font-medium text-stone-500">left</span>
              </p>
              <p className="text-sm tabular-nums text-stone-500">of {meters(fabric.meters_bought)}</p>
            </div>
            <TapeBar left={left} total={Number(fabric.meters_bought)} tone={left <= 0 ? 'empty' : 'ok'} />
          </div>
        </div>
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-200/80 sm:grid-cols-3 lg:grid-cols-6">
        {figures.map((f) => (
          <div key={f.label} className="bg-white p-5">
            <dt className="text-sm text-stone-500">{f.label}</dt>
            <dd className="mt-1 whitespace-nowrap font-display text-xl font-semibold tabular-nums text-ink">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 font-display text-xl font-semibold text-ink">Stock in</h2>
      <Card className="mb-8">
        {stockIn.isLoading ? <Loading /> : null}
        {!stockIn.isLoading && ins.length === 0 ? (
          <EmptyState title="No stock in yet" body="Use Stock in on the stock page to add meters." />
        ) : null}
        {ins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Supplier</Th>
                  <Th>Bought for</Th>
                  <Th align="right">Meters</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ins.map((e) => (
                  <tr key={e.id}>
                    <Td className="whitespace-nowrap text-stone-600">{shortDate(e.entry_date)}</Td>
                    <Td className="text-stone-600">{e.supplier || '-'}</Td>
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
        ) : null}
      </Card>

      <h2 className="mb-3 font-display text-xl font-semibold text-ink">Stock out</h2>
      <Card>
        {usage.isLoading ? <Loading /> : null}
        {!usage.isLoading && outs.length === 0 ? (
          <EmptyState
            title="No stock out yet"
            body="Nothing has been cut from this fabric."
            action={
              <Link to="/out" search={{ lot: fabricId }} className={linkButton}>
                Record stock out
              </Link>
            }
          />
        ) : null}
        {outs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Design</Th>
                  <Th>Used for</Th>
                  <Th align="right">Used</Th>
                  <Th align="right">Wastage</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {outs.map((u) => (
                  <tr key={u.id}>
                    <Td className="whitespace-nowrap text-stone-600">{shortDate(u.usage_date)}</Td>
                    <Td className="text-stone-700">{u.design_code || '-'}</Td>
                    <Td>
                      <Badge tone={u.usage_type === 'sample' ? 'blue' : 'green'}>
                        {u.usage_type === 'sample' ? 'Sample' : 'Kurti'}
                      </Badge>
                    </Td>
                    <Td align="right">{plain(u.meters_used)} m</Td>
                    <Td align="right">{plain(u.wastage_meters)} m</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </>
  )
}
