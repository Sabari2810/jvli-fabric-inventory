import { useState } from 'react'
import { useCanEdit, useDeleteStockIn, useStockIn } from '../lib/queries'
import { meters, rupees, shortDate } from '../lib/format'
import type { StockIn } from '../lib/types'
import { StockInDrawer } from '../components/StockInDrawer'
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
  dangerLink,
  linkButton,
  primaryButton,
} from '../components/ui'

export function StockInPage() {
  const { data, isLoading, error } = useStockIn()
  const deleteEntry = useDeleteStockIn()
  const canEdit = useCanEdit()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StockIn | null>(null)

  function startAdd() {
    setEditing(null)
    setOpen(true)
  }

  function startEdit(e: StockIn) {
    setEditing(e)
    setOpen(true)
  }

  function onDelete(e: StockIn) {
    if (!window.confirm(`Delete this stock in entry of ${meters(e.meters)}? This cannot be undone.`)) return
    deleteEntry.mutate(e.id)
  }

  const rows = data ?? []

  return (
    <>
      <PageHeader
        title="Stock in"
        subtitle="Every time you buy meters of a fabric. Buy the same fabric again and it adds to the same record."
        action={
          canEdit ? (
            <button type="button" className={primaryButton} onClick={startAdd}>
              <Icon name="plus" className="h-4 w-4" />
              Stock in
            </button>
          ) : undefined
        }
      />

      <Card>
        {isLoading ? <Loading /> : null}
        {error ? (
          <div className="p-4">
            <ErrorNote message={error.message} />
          </div>
        ) : null}
        {deleteEntry.error ? (
          <div className="p-4">
            <ErrorNote message={deleteEntry.error.message} />
          </div>
        ) : null}
        {!isLoading && !error && rows.length === 0 ? (
          <EmptyState
            title="No stock in yet"
            body="Record the meters you buy against a fabric and they will show up here."
            action={
              canEdit ? (
                <button type="button" className={primaryButton} onClick={startAdd}>
                  Stock in
                </button>
              ) : undefined
            }
          />
        ) : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Fabric</Th>
                  <Th>Supplier</Th>
                  <Th>Bought for</Th>
                  <Th align="right">Meters</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">Total</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((e) => (
                  <tr key={e.id} className="transition hover:bg-stone-50/70">
                    <Td className="whitespace-nowrap text-stone-600">{shortDate(e.entry_date)}</Td>
                    <Td>
                      <p className="font-semibold text-ink">{e.fabric_lots?.fabric_name ?? '-'}</p>
                      <p className="text-xs text-stone-500">{e.fabric_lots?.color || 'No color'}</p>
                    </Td>
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
                    <Td align="right" className="whitespace-nowrap">
                      {canEdit ? (
                        <>
                      <button type="button" className={`${linkButton} mr-4`} onClick={() => startEdit(e)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={dangerLink}
                        disabled={deleteEntry.isPending}
                        onClick={() => onDelete(e)}
                      >
                        Delete
                      </button>
                        </>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {canEdit ? <StockInDrawer open={open} entry={editing} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
