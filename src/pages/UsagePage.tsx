import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAddUsage, useDeleteUsage, useStock, useUpdateUsage, useUsage } from '../lib/queries'
import { meters, plain, rupees, shortDate, todayISO } from '../lib/format'
import type { FabricUsage, UsageType } from '../lib/types'
import {
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Td,
  Th,
  dangerLink,
  inputClass,
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
  const deleteUsage = useDeleteUsage()
  const updateUsage = useUpdateUsage()
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

  const filteredLot = lotFilter ? lots.find((l) => l.id === lotFilter) : undefined

  const totals = useMemo(() => {
    let used = 0
    let wastage = 0
    let cost = 0
    for (const u of rows) {
      used += Number(u.meters_used)
      wastage += Number(u.wastage_meters)
      cost += Number(u.meters_used) * Number(u.fabric_lots?.rate_per_meter ?? 0)
    }
    return { used, wastage, cost }
  }, [rows])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const used = Number(form.meters_used)
    const wastage = Number(form.wastage_meters) || 0

    if (!form.lot_id) return setFormError('Pick the fabric lot you cut from.')
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
      setEditing(null)
      setForm((f) => ({ ...emptyForm(f.lot_id), usage_date: f.usage_date, usage_type: f.usage_type }))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the usage entry.')
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditing(null)
    setForm(emptyForm(lotFilter ?? ''))
    setFormError(null)
  }

  function onDelete(id: string) {
    if (!window.confirm('Delete this usage entry? The meters go back into stock.')) return
    deleteUsage.mutate(id)
  }

  return (
    <>
      <PageHeader
        title="Fabric usage"
        subtitle="Log fabric every time it is cut, tagged as a sample or an actual kurti."
      />

      <Card className="mb-8">
        <form onSubmit={onSubmit} className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Fabric"
              className="sm:col-span-2"
              hint={available !== null ? `${plain(available)} m left of this fabric` : undefined}
            >
              <select
                required
                className={inputClass}
                value={form.lot_id}
                onChange={(e) => set('lot_id', e.target.value)}
              >
                <option value="">Select a fabric</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fabric_name}{l.color ? `, ${l.color}` : ''} | bought {shortDate(l.purchase_date)}
                    {l.color ? `, ${l.color}` : ''} | {plain(l.meters_left)} m left
                  </option>
                ))}
              </select>
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
            <Field label="Used for">
              <select
                className={inputClass}
                value={form.usage_type}
                onChange={(e) => set('usage_type', e.target.value as UsageType)}
              >
                <option value="actual">Actual kurti</option>
                <option value="sample">Sample</option>
              </select>
            </Field>
            <Field label="Design or style code">
              <input
                placeholder="JV-K-014"
                className={inputClass}
                value={form.design_code}
                onChange={(e) => set('design_code', e.target.value)}
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
            <Field label="Notes">
              <input
                placeholder="Cutting master, batch"
                className={inputClass}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={addUsage.isPending || updateUsage.isPending}
              className={primaryButton}
            >
              {addUsage.isPending || updateUsage.isPending ? 'Saving' : editing ? 'Update entry' : 'Log usage'}
            </button>
            {editing ? (
              <button type="button" className={subtleButton} onClick={cancelEdit}>
                Cancel
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <ErrorNote message={formError} />
            </div>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-4">
          <select
            className={`${inputClass} w-auto`}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | UsageType)}
            aria-label="Filter by type"
          >
            <option value="all">Samples and kurtis</option>
            <option value="sample">Samples only</option>
            <option value="actual">Actual kurtis only</option>
          </select>
          {lotFilter ? (
            <>
              <Badge tone="maroon">
                Showing {filteredLot ? filteredLot.fabric_name : 'one fabric'}
              </Badge>
              <button
                type="button"
                className={subtleButton}
                onClick={() => navigate({ to: '/usage', search: {} })}
              >
                Show all fabrics
              </button>
            </>
          ) : null}
          <p className="ml-auto text-sm text-stone-500">
            {meters(totals.used)} used, {meters(totals.wastage)} wasted, {rupees(totals.cost)} fabric cost
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
            title="No usage logged"
            body={
              lots.length === 0 ? undefined : 'Log the first cut above and it will appear here.'
            }
          />
        ) : null}
        {!usage.isLoading && lots.length === 0 ? (
          <p className="px-6 pb-8 text-center text-sm text-stone-500">
            You need to add a fabric purchase first.{' '}
            <Link to="/lots" className="font-medium text-maroon-900 hover:underline">
              Add a purchase
            </Link>
          </p>
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <Th>Date</Th>
                  <Th>Fabric</Th>
                  <Th>Design</Th>
                  <Th>Type</Th>
                  <Th align="right">Used</Th>
                  <Th align="right">Wastage</Th>
                  <Th align="right">Cost</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <Td className="whitespace-nowrap">{shortDate(u.usage_date)}</Td>
                    <Td>
                      <p className="font-medium text-stone-900">{u.fabric_lots?.fabric_name ?? '-'}</p>
                      <p className="text-xs text-stone-500">
                        {u.fabric_lots?.color || 'No color'}
                      </p>
                    </Td>
                    <Td className="text-stone-700">{u.design_code || '-'}</Td>
                    <Td>
                      <Badge tone={u.usage_type === 'sample' ? 'blue' : 'green'}>
                        {u.usage_type === 'sample' ? 'Sample' : 'Actual kurti'}
                      </Badge>
                    </Td>
                    <Td align="right">{meters(u.meters_used)}</Td>
                    <Td align="right">{meters(u.wastage_meters)}</Td>
                    <Td align="right">
                      {rupees(Number(u.meters_used) * Number(u.fabric_lots?.rate_per_meter ?? 0))}
                    </Td>
                    <Td align="right" className="whitespace-nowrap">
                      <button
                        type="button"
                        className="mr-4 text-sm font-medium text-maroon-900 hover:underline"
                        onClick={() => startEdit(u)}
                      >
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
    </>
  )
}
