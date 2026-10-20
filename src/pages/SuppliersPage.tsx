import { useMemo, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import {
  useCanEdit,
  useDeleteSupplier,
  useSaveSupplier,
  useStockIn,
  useSuppliers,
} from '../lib/queries'
import { meters, rupees, shortDate } from '../lib/format'
import type { Supplier } from '../lib/types'
import {
  Card,
  Drawer,
  EmptyState,
  ErrorNote,
  Field,
  Icon,
  IconButton,
  Loading,
  MobileItem,
  MobileList,
  Stats,
  PageHeader,
  Td,
  Th,
  inputClass,
  linkButton,
  primaryButton,
  subtleButton,
} from '../components/ui'

function normalizeUrl(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export function SuppliersPage() {
  const suppliers = useSuppliers()
  const stockIn = useStockIn()
  const save = useSaveSupplier()
  const del = useDeleteSupplier()
  const canEdit = useCanEdit()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const totals = useMemo(() => {
    const map = new Map<string, { entries: number; meters: number; spent: number; last: string }>()
    for (const e of stockIn.data ?? []) {
      const key = (e.supplier ?? '').trim().toLowerCase()
      if (!key) continue
      const t = map.get(key) ?? { entries: 0, meters: 0, spent: 0, last: '' }
      t.entries += 1
      t.meters += Number(e.meters)
      t.spent += Number(e.meters) * Number(e.rate_per_meter)
      if (e.entry_date > t.last) t.last = e.entry_date
      map.set(key, t)
    }
    return map
  }, [stockIn.data])

  function openForm(s: Supplier | null) {
    setEditing(s)
    setName(s?.name ?? '')
    setPhone(s?.phone ?? '')
    setLocation(s?.location ?? '')
    setWebsite(s?.website ?? '')
    setNotes(s?.notes ?? '')
    setError(null)
    setOpen(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const value = name.trim()
    if (!value) return setError('Enter the supplier name.')
    try {
      await save.mutateAsync({
        id: editing?.id,
        oldName: editing?.name,
        input: {
          name: value,
          phone: phone.trim() || null,
          location: location.trim() || null,
          website: normalizeUrl(website),
          notes: notes.trim() || null,
        },
      })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the supplier.')
    }
  }

  function onDelete(s: Supplier) {
    const count = totals.get(s.name.trim().toLowerCase())?.entries ?? 0
    const note = count > 0 ? ` Its ${count} stock in entries keep the name.` : ''
    if (!window.confirm(`Delete ${s.name} from the supplier list?${note}`)) return
    del.mutate(s.id)
  }

  const rows = suppliers.data ?? []

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Who you buy fabric from, and what you have bought from them."
        action={
          canEdit ? (
            <button type="button" className={primaryButton} onClick={() => openForm(null)}>
              <Icon name="plus" className="h-4 w-4" />
              Add supplier
            </button>
          ) : undefined
        }
      />

      {del.error ? (
        <div className="mb-4">
          <ErrorNote message={del.error.message} />
        </div>
      ) : null}

      {rows.length > 0 ? (
        <MobileList>
          {rows.map((s) => {
            const t = totals.get(s.name.trim().toLowerCase())
            return (
              <MobileItem key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/suppliers/$supplierId"
                      params={{ supplierId: s.id }}
                      className="block font-display text-lg font-semibold leading-snug text-ink after:absolute after:inset-0 hover:text-maroon-900"
                    >
                      {s.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {[s.location, s.phone].filter(Boolean).join(' \u00b7 ') || 'No contact details'}
                    </p>
                    {s.website ? (
                      <a href={s.website} target="_blank" rel="noreferrer" className={`${linkButton} relative z-10 mt-1 inline-block text-xs`}>
                        {s.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      </a>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-500">Spent</p>
                    <p className="whitespace-nowrap font-display text-lg font-semibold tabular-nums">{rupees(t?.spent ?? 0)}</p>
                  </div>
                </div>
                <Stats
                  items={[
                    { label: 'Meters bought', value: meters(t?.meters ?? 0) },
                    { label: 'Last bought', value: t?.last ? shortDate(t.last) : '-' },
                  ]}
                />
                {canEdit ? (
                  <div className="relative z-10 mt-3 flex justify-end">
                    <IconButton icon="edit" label="Edit supplier" onClick={() => openForm(s)} />
                    <IconButton icon="trash" label="Delete supplier" danger onClick={() => onDelete(s)} />
                  </div>
                ) : null}
              </MobileItem>
            )
          })}
        </MobileList>
      ) : null}

      <Card className={rows.length > 0 ? 'hidden md:block' : ''}>
        {suppliers.isLoading || stockIn.isLoading ? <Loading /> : null}
        {suppliers.error ? (
          <div className="p-4">
            <ErrorNote message={suppliers.error.message} />
          </div>
        ) : null}
        {!suppliers.isLoading && !suppliers.error && rows.length === 0 ? (
          <EmptyState
            title="No suppliers yet"
            body="Add a supplier here, or from the Supplier pick list on a stock in entry."
            action={
              canEdit ? (
                <button type="button" className={primaryButton} onClick={() => openForm(null)}>
                  Add supplier
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
                  <Th>Supplier</Th>
                  <Th>Phone</Th>
                  <Th>Location</Th>
                  <Th>Website</Th>
                  <Th align="right">Entries</Th>
                  <Th align="right">Meters bought</Th>
                  <Th align="right">Spent</Th>
                  <Th>Last bought</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((s) => {
                  const t = totals.get(s.name.trim().toLowerCase())
                  return (
                    <tr key={s.id} className="transition hover:bg-stone-50/70">
                      <Td>
                        <Link
                          to="/suppliers/$supplierId"
                          params={{ supplierId: s.id }}
                          className="font-semibold text-ink underline-offset-4 hover:text-maroon-900 hover:underline"
                        >
                          {s.name}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap text-stone-600">{s.phone || '-'}</Td>
                      <Td className="text-stone-600">{s.location || '-'}</Td>
                      <Td>
                        {s.website ? (
                          <a
                            href={s.website}
                            target="_blank"
                            rel="noreferrer"
                            className={linkButton}
                          >
                            {s.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                          </a>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </Td>
                      <Td align="right">{t?.entries ?? 0}</Td>
                      <Td align="right">{meters(t?.meters ?? 0)}</Td>
                      <Td align="right" className="font-semibold">
                        {rupees(t?.spent ?? 0)}
                      </Td>
                      <Td className="whitespace-nowrap text-stone-600">{t?.last ? shortDate(t.last) : '-'}</Td>
                      <Td align="right" className="whitespace-nowrap">
                        <Link to="/suppliers/$supplierId" params={{ supplierId: s.id }} className={`${linkButton} mr-2`}>
                          View
                        </Link>
                        {canEdit ? (
                          <>
                            <IconButton icon="edit" label="Edit supplier" onClick={() => openForm(s)} />
                            <IconButton icon="trash" label="Delete supplier" danger onClick={() => onDelete(s)} />
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

      <Drawer open={open && canEdit} title={editing ? 'Edit supplier' : 'Add supplier'} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Supplier name">
            <input
              autoFocus
              required
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                type="tel"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Location">
              <input
                placeholder="Chennai"
                className={inputClass}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Website">
            <input
              type="text"
              inputMode="url"
              placeholder="www.example.com"
              className={inputClass}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <input
              placeholder="Minimum order, what they supply"
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <ErrorNote message={error} />
          <div className="sticky bottom-0 z-10 -mx-5 flex gap-3 border-t border-stone-100 bg-white px-5 pb-4 pt-4 md:static md:mx-0 md:px-0 md:pb-0 md:pt-5">
            <button type="submit" disabled={save.isPending} className={primaryButton}>
              {save.isPending ? 'Saving' : editing ? 'Save changes' : 'Add supplier'}
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
