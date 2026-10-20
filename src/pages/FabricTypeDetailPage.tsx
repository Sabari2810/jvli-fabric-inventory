import { Link } from '@tanstack/react-router'
import { useFabricTypes, useStock } from '../lib/queries'
import { meters, rupees } from '../lib/format'
import { Card, EmptyState, ErrorNote, Loading, Td, Th, Thumb, linkButton } from '../components/ui'

export function FabricTypeDetailPage({ typeId }: { typeId: string }) {
  const types = useFabricTypes()
  const stock = useStock()

  if (types.isLoading || stock.isLoading) return <Loading />
  if (types.error) return <ErrorNote message={types.error.message} />

  const type = (types.data ?? []).find((t) => t.id === typeId)
  if (!type) {
    return (
      <Card>
        <EmptyState
          title="Fabric type not found"
          body="It may have been deleted."
          action={
            <Link to="/fabric-types" className={linkButton}>
              Back to fabric types
            </Link>
          }
        />
      </Card>
    )
  }

  const fabrics = (stock.data ?? []).filter((f) => f.fabric_type_id === typeId)
  const bought = fabrics.reduce((a, f) => a + Number(f.meters_bought), 0)
  const left = fabrics.reduce((a, f) => a + Number(f.meters_left), 0)
  const value = fabrics.reduce((a, f) => a + Number(f.meters_left) * Number(f.rate_per_meter), 0)

  const figures = [
    { label: 'Fabrics', value: String(fabrics.length) },
    { label: 'Stock in', value: meters(bought) },
    { label: 'Left', value: meters(left) },
    { label: 'Stock value', value: rupees(value) },
  ]

  return (
    <>
      <Link to="/fabric-types" className="mb-6 inline-block text-sm text-stone-500 hover:text-ink">
        Back to fabric types
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{type.name}</h1>

      <dl className="my-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-200/80 lg:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label} className="bg-white p-5">
            <dt className="text-sm text-stone-500">{f.label}</dt>
            <dd className="mt-1 whitespace-nowrap font-display text-xl font-semibold tabular-nums text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 font-display text-xl font-semibold text-ink">Fabrics of this type</h2>
      <Card>
        {fabrics.length === 0 ? (
          <EmptyState title="No fabrics yet" body="Set this type on a fabric from the Stock page." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead>
                <tr>
                  <Th />
                  <Th>Fabric</Th>
                  <Th align="right">Width</Th>
                  <Th align="right">Stock in</Th>
                  <Th align="right">Left</Th>
                  <Th align="right">Avg rate</Th>
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
                    <Td align="right">{f.width_inches ? `${f.width_inches} in` : '-'}</Td>
                    <Td align="right">{meters(f.meters_bought)}</Td>
                    <Td align="right" className="font-semibold">
                      {meters(f.meters_left)}
                    </Td>
                    <Td align="right">{rupees(f.rate_per_meter)}</Td>
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
