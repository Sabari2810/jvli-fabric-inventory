import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  useCanEdit,
  useDeleteStyle,
  useDropStyles,
  useFabricTypes,
  usePatterns,
  useStock,
} from '../lib/queries'
import { costing } from '../lib/costing'
import { meters, rupees } from '../lib/format'
import type { DropStyle } from '../lib/types'
import { StyleDrawer } from './StyleDrawer'
import { Card, EmptyState, ErrorNote, Icon, IconButton, Loading, Td, Th, Thumb, primaryButton } from './ui'

export function StylesTab({ dropId }: { dropId: string }) {
  const styles = useDropStyles()
  const patterns = usePatterns()
  const types = useFabricTypes()
  const stock = useStock()
  const del = useDeleteStyle()
  const canEdit = useCanEdit()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DropStyle | null>(null)

  const rows = useMemo(
    () => (styles.data ?? []).filter((s) => s.drop_id === dropId).sort((a, b) => a.position - b.position),
    [styles.data, dropId],
  )
  const patternBy = useMemo(() => new Map((patterns.data ?? []).map((p) => [p.id, p])), [patterns.data])
  const typeBy = useMemo(() => new Map((types.data ?? []).map((t) => [t.id, t])), [types.data])
  const fabricBy = useMemo(() => new Map((stock.data ?? []).map((f) => [f.id, f])), [stock.data])

  const totals = useMemo(() => {
    let mrp = 0
    let pieces = 0
    let needed = 0
    for (const s of rows) {
      mrp += costing(s).mrp
      pieces += s.planned_qty ?? 0
      needed += (s.planned_qty ?? 0) * Number(s.fabric_usage_m)
    }
    return { avg: rows.length ? mrp / rows.length : 0, pieces, needed }
  }, [rows])

  function openForm(s: DropStyle | null) {
    setEditing(s)
    setOpen(true)
  }

  function onDelete(s: DropStyle) {
    if (!window.confirm(`Remove ${patternBy.get(s.pattern_id)?.pattern_no ?? 'this style'} from the drop?`)) return
    del.mutate(s.id)
  }

  if (styles.isLoading || patterns.isLoading) return <Loading />
  if (styles.error) return <ErrorNote message={styles.error.message} />

  const figures = [
    { label: 'Styles', value: String(rows.length) },
    { label: 'Average MRP', value: rupees(totals.avg) },
    { label: 'Planned pieces', value: String(totals.pieces) },
    { label: 'Fabric needed', value: meters(totals.needed) },
  ]

  return (
    <>
      {del.error ? <ErrorNote message={del.error.message} /> : null}

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-ink">Styles in this drop</h2>
        {canEdit ? (
          <button type="button" className={primaryButton} onClick={() => openForm(null)}>
            <Icon name="plus" className="h-4 w-4" />
            Add style
          </button>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-200/80 lg:grid-cols-4">
          {figures.map((f) => (
            <div key={f.label} className="bg-white p-5">
              <dt className="text-sm text-stone-500">{f.label}</dt>
              <dd className="mt-1 whitespace-nowrap font-display text-xl font-semibold tabular-nums text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No styles in this drop yet"
            body="Add a style per pattern with its fabric, lining and costing."
            action={
              canEdit ? (
                <button type="button" className={primaryButton} onClick={() => openForm(null)}>
                  Add style
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Pattern</Th>
                  <Th>Fabric</Th>
                  <Th align="right">Fabric</Th>
                  <Th align="right">Lining</Th>
                  <Th align="right">Raw material</Th>
                  <Th align="right">Stitching</Th>
                  <Th align="right">Misc</Th>
                  <Th align="right">Profit</Th>
                  <Th align="right">GST</Th>
                  <Th align="right">Shipping</Th>
                  <Th align="right">MRP</Th>
                  <Th align="right">Planned</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((s) => {
                  const c = costing(s)
                  const fab = s.fabric_id ? fabricBy.get(s.fabric_id) : undefined
                  const type = s.fabric_type_id ? typeBy.get(s.fabric_type_id) : undefined
                  return (
                    <tr key={s.id} className="transition hover:bg-stone-50/70">
                      <Td>
                        <Thumb src={s.reference_image} name="Reference" className="h-16 w-12" />
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Thumb
                            src={patternBy.get(s.pattern_id)?.image_data}
                            name="Pattern"
                            className="h-16 w-12"
                          />
                          <span className="font-semibold text-ink">{patternBy.get(s.pattern_id)?.pattern_no ?? '-'}</span>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Thumb src={s.fabric_image ?? fab?.image_data} name="Swatch" className="h-10 w-10" />
                          <div className="min-w-0">
                            {fab ? (
                              <Link
                                to="/fabric/$fabricId"
                                params={{ fabricId: fab.id }}
                                className="font-semibold text-ink underline-offset-4 hover:text-maroon-900 hover:underline"
                              >
                                {fab.fabric_name}
                              </Link>
                            ) : (
                              <span className="text-stone-500">Not linked</span>
                            )}
                            <p className="whitespace-nowrap text-xs text-stone-500">
                              {type?.name ?? 'No type'}
                              {s.width_inches ? `, ${s.width_inches} in` : ''}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td align="right">
                        <span className="block">{rupees(c.fabric)}</span>
                        <span className="block text-xs text-stone-500">
                          {s.fabric_usage_m} m x {rupees(s.fabric_rate)}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="block">{rupees(c.lining)}</span>
                        <span className="block text-xs text-stone-500">
                          {s.lining_usage_m} m x {rupees(s.lining_rate)}
                        </span>
                      </Td>
                      <Td align="right">{rupees(c.raw)}</Td>
                      <Td align="right">{rupees(s.stitching)}</Td>
                      <Td align="right">{rupees(s.misc)}</Td>
                      <Td align="right">{rupees(s.profit)}</Td>
                      <Td align="right">{rupees(s.gst)}</Td>
                      <Td align="right">{rupees(s.shipping)}</Td>
                      <Td align="right" className="font-semibold text-maroon-900">
                        {rupees(c.mrp)}
                      </Td>
                      <Td align="right">{s.planned_qty ?? '-'}</Td>
                      <Td align="right" className="whitespace-nowrap">
                        {canEdit ? (
                          <>
                            <IconButton icon="edit" label="Edit style" onClick={() => openForm(s)} />
                            <IconButton icon="trash" label="Remove style" danger onClick={() => onDelete(s)} />
                          </>
                        ) : null}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <StyleDrawer
        open={open && canEdit}
        onClose={() => setOpen(false)}
        dropId={dropId}
        style={editing}
        nextPosition={rows.length + 1}
      />
    </>
  )
}
