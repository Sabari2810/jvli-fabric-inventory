import { useMemo, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import {
  useAddFabricType,
  useCanEdit,
  useDeleteFabricType,
  useFabricTypes,
  useRenameFabricType,
  useStock,
} from '../lib/queries'
import { meters } from '../lib/format'
import type { FabricType } from '../lib/types'
import {
  Card,
  Drawer,
  EmptyState,
  ErrorNote,
  Field,
  Icon,
  IconButton,
  Loading,
  PageHeader,
  Td,
  Th,
  inputClass,
  linkButton,
  primaryButton,
  subtleButton,
} from '../components/ui'

export function FabricTypesPage() {
  const types = useFabricTypes()
  const stock = useStock()
  const add = useAddFabricType()
  const rename = useRenameFabricType()
  const del = useDeleteFabricType()
  const canEdit = useCanEdit()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FabricType | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const totals = useMemo(() => {
    const map = new Map<string, { fabrics: number; bought: number; left: number }>()
    for (const f of stock.data ?? []) {
      if (!f.fabric_type_id) continue
      const t = map.get(f.fabric_type_id) ?? { fabrics: 0, bought: 0, left: 0 }
      t.fabrics += 1
      t.bought += Number(f.meters_bought)
      t.left += Number(f.meters_left)
      map.set(f.fabric_type_id, t)
    }
    return map
  }, [stock.data])

  function openForm(t: FabricType | null) {
    setEditing(t)
    setName(t?.name ?? '')
    setError(null)
    setOpen(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const value = name.trim()
    if (!value) return setError('Enter a name for the fabric type.')
    try {
      if (editing) await rename.mutateAsync({ id: editing.id, name: value })
      else await add.mutateAsync(value)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the fabric type.')
    }
  }

  function onDelete(t: FabricType) {
    const count = totals.get(t.id)?.fabrics ?? 0
    const note = count > 0 ? ` Its ${count} fabrics stay in stock, just without a type.` : ''
    if (!window.confirm(`Delete ${t.name}?${note}`)) return
    del.mutate(t.id)
  }

  const rows = types.data ?? []
  const saving = add.isPending || rename.isPending

  return (
    <>
      <PageHeader
        title="Fabric types"
        subtitle="Cambric cotton, Jaipuri cotton and so on. Set on each fabric, with its width in inches."
        action={
          canEdit ? (
            <button type="button" className={primaryButton} onClick={() => openForm(null)}>
              <Icon name="plus" className="h-4 w-4" />
              Add fabric type
            </button>
          ) : undefined
        }
      />
      <Card>
        {types.isLoading || stock.isLoading ? <Loading /> : null}
        {types.error ? (
          <div className="p-4">
            <ErrorNote message={types.error.message} />
          </div>
        ) : null}
        {del.error ? (
          <div className="p-4">
            <ErrorNote message={del.error.message} />
          </div>
        ) : null}
        {!types.isLoading && !types.error && rows.length === 0 ? (
          <EmptyState
            title="No fabric types yet"
            body="Add one here, or from the Fabric type pick list when you add a fabric."
            action={
              canEdit ? (
                <button type="button" className={primaryButton} onClick={() => openForm(null)}>
                  Add fabric type
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
                  <Th>Fabric type</Th>
                  <Th align="right">Fabrics</Th>
                  <Th align="right">Stock in</Th>
                  <Th align="right">Left</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((t) => {
                  const x = totals.get(t.id)
                  return (
                    <tr key={t.id} className="transition hover:bg-stone-50/70">
                      <Td>
                        <Link
                          to="/fabric-types/$typeId"
                          params={{ typeId: t.id }}
                          className="font-semibold text-ink underline-offset-4 hover:text-maroon-900 hover:underline"
                        >
                          {t.name}
                        </Link>
                      </Td>
                      <Td align="right">{x?.fabrics ?? 0}</Td>
                      <Td align="right">{meters(x?.bought ?? 0)}</Td>
                      <Td align="right" className="font-semibold">
                        {meters(x?.left ?? 0)}
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        <Link to="/fabric-types/$typeId" params={{ typeId: t.id }} className={`${linkButton} mr-2`}>
                          View
                        </Link>
                        {canEdit ? (
                          <>
                            <IconButton icon="edit" label="Rename fabric type" onClick={() => openForm(t)} />
                            <IconButton icon="trash" label="Delete fabric type" danger onClick={() => onDelete(t)} />
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

      <Drawer open={open && canEdit} title={editing ? 'Rename fabric type' : 'Add fabric type'} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Fabric type">
            <input
              autoFocus
              required
              placeholder="Cambric Cotton"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <ErrorNote message={error} />
          <div className="flex gap-3 border-t border-stone-100 pt-5">
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? 'Saving' : editing ? 'Save name' : 'Add fabric type'}
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
