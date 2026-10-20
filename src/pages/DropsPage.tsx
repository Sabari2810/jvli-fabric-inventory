import { useMemo, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useAddDrop, useCanEdit, useDeleteDrop, useDrops, useRenameDrop, useStock } from '../lib/queries'
import { meters, rupees } from '../lib/format'
import {
  Card,
  Drawer,
  EmptyState,
  ErrorNote,
  Field,
  Icon,
  Loading,
  PageHeader,
  Td,
  IconButton,
  Th,
  inputClass,
  linkButton,
  primaryButton,
  subtleButton,
} from '../components/ui'
import type { Drop } from '../lib/types'

export function DropsPage() {
  const drops = useDrops()
  const stock = useStock()
  const addDrop = useAddDrop()
  const renameDrop = useRenameDrop()
  const deleteDrop = useDeleteDrop()
  const canEdit = useCanEdit()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Drop | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const totals = useMemo(() => {
    const map = new Map<string, { fabrics: number; bought: number; out: number; left: number; value: number }>()
    for (const f of stock.data ?? []) {
      if (!f.drop_id) continue
      const t = map.get(f.drop_id) ?? { fabrics: 0, bought: 0, out: 0, left: 0, value: 0 }
      t.fabrics += 1
      t.bought += Number(f.meters_bought)
      t.out += Number(f.meters_sample) + Number(f.meters_actual) + Number(f.meters_wastage)
      t.left += Number(f.meters_left)
      t.value += Number(f.meters_left) * Number(f.rate_per_meter)
      map.set(f.drop_id, t)
    }
    return map
  }, [stock.data])

  function startAdd() {
    setEditing(null)
    setName('')
    setError(null)
    setOpen(true)
  }

  function startRename(d: Drop) {
    setEditing(d)
    setName(d.name)
    setError(null)
    setOpen(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const value = name.trim()
    if (!value) return setError('Enter a name for the drop.')
    try {
      if (editing) await renameDrop.mutateAsync({ id: editing.id, name: value })
      else await addDrop.mutateAsync(value)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the drop.')
    }
  }

  function onDelete(d: Drop) {
    const count = totals.get(d.id)?.fabrics ?? 0
    const note = count > 0 ? ` Its ${count} fabrics stay in stock, just without a drop.` : ''
    if (!window.confirm(`Delete ${d.name}?${note}`)) return
    deleteDrop.mutate(d.id)
  }

  const rows = drops.data ?? []
  const saving = addDrop.isPending || renameDrop.isPending

  return (
    <>
      <PageHeader
        title="Drops"
        subtitle="Group fabrics by launch and see the total for each."
        action={
          canEdit ? (
            <button type="button" className={primaryButton} onClick={startAdd}>
              <Icon name="plus" className="h-4 w-4" />
              New drop
            </button>
          ) : undefined
        }
      />

      {deleteDrop.error ? (
        <div className="mb-4">
          <ErrorNote message={deleteDrop.error.message} />
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="space-y-3 md:hidden">
          {rows.map((d) => {
            const t = totals.get(d.id) ?? { fabrics: 0, bought: 0, out: 0, left: 0, value: 0 }
            return (
              <li key={d.id} className="relative rounded-2xl border border-stone-200/80 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/drops/$dropId"
                      params={{ dropId: d.id }}
                      className="block font-display text-lg font-semibold leading-snug text-ink after:absolute after:inset-0 hover:text-maroon-900"
                    >
                      {d.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {t.fabrics} {t.fabrics === 1 ? 'fabric' : 'fabrics'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-500">Stock value</p>
                    <p className="whitespace-nowrap font-display text-lg font-semibold tabular-nums text-ink">
                      {rupees(t.value)}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-stone-200/80 text-center">
                  <div className="bg-stone-50 py-2.5">
                    <dt className="text-xs text-stone-500">Stock in</dt>
                    <dd className="whitespace-nowrap text-sm font-semibold tabular-nums">{meters(t.bought)}</dd>
                  </div>
                  <div className="bg-stone-50 py-2.5">
                    <dt className="text-xs text-stone-500">Stock out</dt>
                    <dd className="whitespace-nowrap text-sm font-semibold tabular-nums">{meters(t.out)}</dd>
                  </div>
                  <div className="bg-maroon-50 py-2.5">
                    <dt className="text-xs text-maroon-900/70">Left</dt>
                    <dd className="whitespace-nowrap text-sm font-semibold tabular-nums text-maroon-900">{meters(t.left)}</dd>
                  </div>
                </dl>
                {canEdit ? (
                  <div className="relative z-10 mt-3 flex justify-end">
                    <IconButton icon="edit" label="Rename drop" onClick={() => startRename(d)} />
                    <IconButton icon="trash" label="Delete drop" danger onClick={() => onDelete(d)} />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      <Card className={rows.length > 0 ? 'hidden md:block' : ''}>
        {drops.isLoading || stock.isLoading ? <Loading /> : null}
        {drops.error ? (
          <div className="p-4">
            <ErrorNote message={drops.error.message} />
          </div>
        ) : null}
        {!drops.isLoading && !drops.error && rows.length === 0 ? (
          <EmptyState
            title="No drops yet"
            body="Create a drop like October Drop, then assign fabrics to it when you edit them."
            action={
              canEdit ? (
                <button type="button" className={primaryButton} onClick={startAdd}>
                  New drop
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
                  <Th>Drop</Th>
                  <Th align="right">Fabrics</Th>
                  <Th align="right">Stock in</Th>
                  <Th align="right">Stock out</Th>
                  <Th align="right">Left</Th>
                  <Th align="right">Stock value</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((d) => {
                  const t = totals.get(d.id) ?? { fabrics: 0, bought: 0, out: 0, left: 0, value: 0 }
                  return (
                    <tr key={d.id} className="transition hover:bg-stone-50/70">
                      <Td>
                        <Link
                          to="/drops/$dropId"
                          params={{ dropId: d.id }}
                          className="font-semibold text-ink underline-offset-4 hover:text-maroon-900 hover:underline"
                        >
                          {d.name}
                        </Link>
                      </Td>
                      <Td align="right">{t.fabrics}</Td>
                      <Td align="right">{meters(t.bought)}</Td>
                      <Td align="right">{meters(t.out)}</Td>
                      <Td align="right" className="font-semibold">
                        {meters(t.left)}
                      </Td>
                      <Td align="right">{rupees(t.value)}</Td>
                      <Td align="right" className="whitespace-nowrap">
                        <Link to="/drops/$dropId" params={{ dropId: d.id }} className={`${linkButton} mr-4`}>
                          View
                        </Link>
                        {canEdit ? (
                          <>
                        <IconButton icon="edit" label="Rename drop" onClick={() => startRename(d)} />
                        <IconButton icon="trash" label="Delete drop" danger onClick={() => onDelete(d)} />
                          </>
                        ) : null}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Drawer open={open && canEdit} title={editing ? 'Rename drop' : 'New drop'} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Drop name">
            <input
              autoFocus
              required
              placeholder="October Drop"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <ErrorNote message={error} />
          <div className="flex gap-3 border-t border-stone-100 pt-5">
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? 'Saving' : editing ? 'Save name' : 'Create drop'}
            </button>
            <button type="button" className={subtleButton} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Drawer>
    </>
  )
}
