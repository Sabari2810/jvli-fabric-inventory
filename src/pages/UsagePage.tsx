import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  useAddUsage,
  useDeleteUsage,
  useStock,
  useUpdateUsage,
  useUsage,
} from '../lib/queries'
import { meters, plain, rupees, shortDate, todayISO } from '../lib/format'
import type { FabricUsage, UsageType } from '../lib/types'
import { Combobox } from '../components/Combobox'
import {
  Badge,
  Card,
  Drawer,
  EmptyState,
  ErrorNote,
  Field,
  Icon,
  Loading,
  PageHeader,
  Td,
  Th,
  dangerLink,
  inputClass,
  linkButton,
  primaryButton,
  subtleButton,
} from '../components/ui'

interface FormState {
  lot_id: string
  usage_date: string
  design_code: string
  usage_type: UsageType
  meters_used: string
  wastage_meters: string
  notes: string
}

const emptyForm = (lotId: string): FormState => ({
  lot_id: lotId,
  usage_date: todayISO(),
  design_code: '',
  usage_type: 'actual',
  meters_used: '',
  wastage_meters: '',
  notes: '',
})

export function UsagePage({ lotFilter }: { lotFilter?: string }) {
  const navigate = useNavigate()
  const stock = useStock()
  const usage = useUsage()
  const addUsage = useAddUsage()
  const updateUsage = useUpdateUsage()
  const deleteUsage = useDeleteUsage()

  const [open, setOpen] = useState(!!lotFilter)
  const [editing, setEditing] = useState<FabricUsage | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm(lotFilter ?? ''))
  const [formError, setFormError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | UsageType>('all')

  const lots = stock.data ?? []
  const selectedLot = lots.find((l) => l.id === form.lot_id)
  // When editing, the entry's own meters are given back before checking what is left.
  const addBack =
    editing && editing.lot_id === form.lot_id
      ? Number(editing.meters_used) + Number(editing.wastage_meters)
      : 0
  const available = selectedLot ? Number(selectedLot.meters_left) + addBack : null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const rows = useMemo(() => {
    return (usage.data ?? []).filter((u) => {
      if (lotFilter && u.lot_id !== lotFilter) return false
      if (typeFilter !== 'all' && u.usage_type !== typeFilter) return false
      return true
    })
  }, [usage.data, lotFilter, typeFilter])

  const rateByFabric = useMemo(
    () => new Map(lots.map((l) => [l.id, Number(l.rate_per_meter)])),
    [lots],
  )
  const filteredLot = lotFilter ? lots.find((l) => l.id === lotFilter) : undefined

  const totals = useMemo(() => {
    let used = 0
    let wastage = 0
    let cost = 0
    for (const u of rows) {
      used += Number(u.meters_used)
      wastage += Number(u.wastage_meters)
      cost += Number(u.meters_used) * (rateByFabric.get(u.lot_id) ?? 0)
    }
    return { used, wastage, cost }
  }, [rows])

  function startAdd() {
    setEditing(null)
    setForm(emptyForm(lotFilter ?? ''))
    setFormError(null)
    setOpen(true)
  }

  function startEdit(u: FabricUsage) {
    setEditing(u)
    setFormError(null)
    setForm({
      lot_id: u.lot_id,
      usage_date: u.usage_date,
      design_code: u.design_code ?? '',
      usage_type: u.usage_type,
      meters_used: String(u.meters_used),
      wastage_meters: String(u.wastage_meters),
      notes: u.notes ?? '',
    })
    setOpen(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const used = Number(form.meters_used)
    const wastage = Number(form.wastage_meters) || 0

    if (!form.lot_id) return setFormError('Pick the fabric you cut from.')
    if (!Number.isFinite(used) || used <= 0) return setFormError('Meters used must be more than 0.')
    if (wastage < 0) return setFormError('Wastage cannot be negative.')
    if (available !== null && used + wastage > available) {
      return setFormError(`Only ${plain(available)} m is left of this fabric.`)
    }

    try {
      const payload = {
        lot_id: form.lot_id,
        usage_date: form.usage_date,
        design_code: form.design_code.trim() || null,
        usage_type: form.usage_type,
        meters_used: used,
        wastage_meters: wastage,
        notes: form.notes.trim() || null,
      }
      if (editing) await updateUsage.mutateAsync({ id: editing.id, patch: payload })
      else await addUsage.mutateAsync(payload)
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the usage entry.')
    }
  }

  function onDelete(id: string) {
    if (!window.confirm('Delete this usage entry? The meters go back into stock.')) return
    deleteUsage.mutate(id)
  }

  const saving = addUsage.isPending || updateUsage.isPending

  return (
    <>
      <PageHeader
        title="Stock out"
        subtitle="Record fabric each time it is cut, tagged as a sample or a kurti for sale."
        action={
          <button type="button" className={primaryButton} onClick={startAdd}>
            <Icon name="plus" className="h-4 w-4" />
            Stock out
          </button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-stone-100 p-4">
          <Combobox
            className="w-52"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as 'all' | UsageType)}
            ariaLabel="Filter by type"
            options={[
              { value: 'all', label: 'Samples and kurtis' },
              { value: 'sample', label: 'Samples only' },
              { value: 'actual', label: 'Kurtis only' },
            ]}
          />
          {lotFilter ? (
            <>
              <Badge tone="maroon">Showing {filteredLot ? filteredLot.fabric_name : 'one fabric'}</Badge>
              <button
                type="button"
                className={subtleButton}
                onClick={() => navigate({ to: '/out', search: {} })}
              >
                Show all fabrics
              </button>
            </>
          ) : null}
          <p className="text-sm text-stone-500 sm:ml-auto">
            {meters(totals.used)} used, {meters(totals.wastage)} wasted, {rupees(totals.cost)} of fabric
          </p>
        </div>

        {usage.isLoading ? <Loading /> : null}
        {usage.error ? (
          <div className="p-4">
            <ErrorNote message={usage.error.message} />
          </div>
        ) : null}
        {deleteUsage.error ? (
          <div className="p-4">
            <ErrorNote message={deleteUsage.error.message} />
          </div>
        ) : null}

        {!usage.isLoading && !usage.error && rows.length === 0 ? (
          <EmptyState
            title="No stock out yet"
            body={
              lots.length === 0
                ? 'Add a fabric and its stock in first, then record what you cut from it.'
                : 'Record the first cut and it will appear here.'
            }
            action={
              lots.length === 0 ? (
                <Link to="/" className={primaryButton}>
                  Go to stock
                </Link>
              ) : (
                <button type="button" className={primaryButton} onClick={startAdd}>
                  Stock out
                </button>
              )
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
                  <Th>Design</Th>
                  <Th>Used for</Th>
                  <Th align="right">Used</Th>
                  <Th align="right">Wastage</Th>
                  <Th align="right">Cost</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((u) => (
                  <tr key={u.id} className="transition hover:bg-stone-50/70">
                    <Td className="whitespace-nowrap text-stone-600">{shortDate(u.usage_date)}</Td>
                    <Td>
                      <p className="font-semibold text-ink">{u.fabric_lots?.fabric_name ?? '-'}</p>
                      <p className="text-xs text-stone-500">{u.fabric_lots?.color || 'No color'}</p>
                    </Td>
                    <Td className="text-stone-700">{u.design_code || '-'}</Td>
                    <Td>
                      <Badge tone={u.usage_type === 'sample' ? 'blue' : 'green'}>
                        {u.usage_type === 'sample' ? 'Sample' : 'Kurti'}
                      </Badge>
                    </Td>
                    <Td align="right">{meters(u.meters_used)}</Td>
                    <Td align="right">{meters(u.wastage_meters)}</Td>
                    <Td align="right" className="font-semibold">
                      {rupees(Number(u.meters_used) * (rateByFabric.get(u.lot_id) ?? 0))}
                    </Td>
                    <Td align="right" className="whitespace-nowrap">
                      <button type="button" className={`${linkButton} mr-4`} onClick={() => startEdit(u)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={dangerLink}
                        disabled={deleteUsage.isPending}
                        onClick={() => onDelete(u.id)}
                      >
                        Delete
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Drawer open={open} title={editing ? 'Edit stock out' : 'Stock out'} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-5">
          <Field
            label="Fabric"
            hint={available !== null ? `${plain(available)} m available` : undefined}
          >
            <Combobox
              value={form.lot_id}
              onChange={(v) => set('lot_id', v)}
              placeholder="Select a fabric"
              options={lots.map((l) => ({
                value: l.id,
                label: `${l.fabric_name}${l.color ? `, ${l.color}` : ''}`,
                hint: `${plain(l.meters_left)} m left`,
              }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Used for">
              <Combobox
                value={form.usage_type}
                onChange={(v) => set('usage_type', v as UsageType)}
                options={[
                  { value: 'actual', label: 'Kurti for sale' },
                  { value: 'sample', label: 'Sample' },
                ]}
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                required
                className={inputClass}
                value={form.usage_date}
                onChange={(e) => set('usage_date', e.target.value)}
              />
            </Field>
            <Field label="Meters used">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                className={inputClass}
                value={form.meters_used}
                onChange={(e) => set('meters_used', e.target.value)}
              />
            </Field>
            <Field label="Wastage (m)">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.wastage_meters}
                onChange={(e) => set('wastage_meters', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Design or style code">
            <input
              placeholder="JV-K-014"
              className={inputClass}
              value={form.design_code}
              onChange={(e) => set('design_code', e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <input
              placeholder="Cutting master, batch"
              className={inputClass}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>

          <ErrorNote message={formError} />
          <div className="flex gap-3 border-t border-stone-100 pt-5">
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? 'Saving' : editing ? 'Save changes' : 'Stock out'}
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
