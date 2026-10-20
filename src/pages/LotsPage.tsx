import { useState, type FormEvent } from 'react'
import { useAddLot, useDeleteLot, useLots } from '../lib/queries'
import { meters, rupees, shortDate, todayISO } from '../lib/format'
import type { Purpose } from '../lib/types'
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
} from '../components/ui'

interface FormState {
  purchase_date: string
  supplier: string
  fabric_name: string
  color: string
  meters_bought: string
  rate_per_meter: string
  purpose: Purpose
  low_stock_meters: string
  notes: string
}

const emptyForm = (): FormState => ({
  purchase_date: todayISO(),
  supplier: '',
  fabric_name: '',
  color: '',
  meters_bought: '',
  rate_per_meter: '',
  purpose: 'production',
  low_stock_meters: '5',
  notes: '',
})

export function LotsPage() {
  const { data, isLoading, error } = useLots()
  const addLot = useAddLot()
  const deleteLot = useDeleteLot()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const bought = Number(form.meters_bought)
    if (!form.fabric_name.trim()) return setFormError('Enter the fabric name.')
    if (!Number.isFinite(bought) || bought <= 0) return setFormError('Meters bought must be more than 0.')

    try {
      await addLot.mutateAsync({
        purchase_date: form.purchase_date,
        supplier: form.supplier.trim() || null,
        fabric_name: form.fabric_name.trim(),
        color: form.color.trim() || null,
        meters_bought: bought,
        rate_per_meter: Number(form.rate_per_meter) || 0,
        purpose: form.purpose,
        low_stock_meters: Number(form.low_stock_meters) || 0,
        notes: form.notes.trim() || null,
      })
      setForm(emptyForm())
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the purchase.')
    }
  }

  function onDelete(id: string, code: string) {
    if (!window.confirm(`Delete ${code}? This cannot be undone.`)) return
    deleteLot.mutate(id)
  }

  const lots = data ?? []

  return (
    <>
      <PageHeader
        title="Fabric purchases"
        subtitle="Record every lot you buy. Each lot gets its own ID so usage can be traced back to it."
      />

      <Card className="mb-8">
        <form onSubmit={onSubmit} className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Date">
              <input
                type="date"
                required
                className={inputClass}
                value={form.purchase_date}
                onChange={(e) => set('purchase_date', e.target.value)}
              />
            </Field>
            <Field label="Fabric name">
              <input
                required
                placeholder="Cotton, rayon, chanderi"
                className={inputClass}
                value={form.fabric_name}
                onChange={(e) => set('fabric_name', e.target.value)}
              />
            </Field>
            <Field label="Color">
              <input
                placeholder="Indigo"
                className={inputClass}
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
              />
            </Field>
            <Field label="Supplier">
              <input
                placeholder="Supplier name"
                className={inputClass}
                value={form.supplier}
                onChange={(e) => set('supplier', e.target.value)}
              />
            </Field>
            <Field label="Meters bought">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                className={inputClass}
                value={form.meters_bought}
                onChange={(e) => set('meters_bought', e.target.value)}
              />
            </Field>
            <Field label="Rate per meter (INR)">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.rate_per_meter}
                onChange={(e) => set('rate_per_meter', e.target.value)}
              />
            </Field>
            <Field label="Bought for">
              <select
                className={inputClass}
                value={form.purpose}
                onChange={(e) => set('purpose', e.target.value as Purpose)}
              >
                <option value="production">Production (actual kurtis)</option>
                <option value="sample">Sample</option>
              </select>
            </Field>
            <Field label="Low stock alert at (m)">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.low_stock_meters}
                onChange={(e) => set('low_stock_meters', e.target.value)}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-4">
              <input
                placeholder="Bill number, quality remarks"
                className={inputClass}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={addLot.isPending} className={primaryButton}>
              {addLot.isPending ? 'Saving' : 'Save purchase'}
            </button>
            <div className="min-w-0 flex-1">
              <ErrorNote message={formError} />
            </div>
          </div>
        </form>
      </Card>

      <Card>
        {isLoading ? <Loading /> : null}
        {error ? (
          <div className="p-4">
            <ErrorNote message={error.message} />
          </div>
        ) : null}
        {deleteLot.error ? (
          <div className="p-4">
            <ErrorNote message={deleteLot.error.message} />
          </div>
        ) : null}
        {!isLoading && !error && lots.length === 0 ? (
          <EmptyState title="No purchases yet" body="Your saved lots will show up here." />
        ) : null}
        {lots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <Th>Lot</Th>
                  <Th>Fabric</Th>
                  <Th>Supplier</Th>
                  <Th>Purpose</Th>
                  <Th align="right">Meters</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">Total cost</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {lots.map((l) => (
                  <tr key={l.id} className="hover:bg-stone-50">
                    <Td>
                      <p className="font-medium text-stone-900">{l.lot_code}</p>
                      <p className="text-xs text-stone-500">{shortDate(l.purchase_date)}</p>
                    </Td>
                    <Td>
                      <p className="text-stone-900">{l.fabric_name}</p>
                      <p className="text-xs text-stone-500">{l.color || 'No color'}</p>
                    </Td>
                    <Td className="text-stone-600">{l.supplier || '-'}</Td>
                    <Td>
                      <Badge tone={l.purpose === 'sample' ? 'blue' : 'rose'}>
                        {l.purpose === 'sample' ? 'Sample' : 'Production'}
                      </Badge>
                    </Td>
                    <Td align="right">{meters(l.meters_bought)}</Td>
                    <Td align="right">{rupees(l.rate_per_meter)}</Td>
                    <Td align="right">{rupees(Number(l.meters_bought) * Number(l.rate_per_meter))}</Td>
                    <Td align="right">
                      <button
                        type="button"
                        className={dangerLink}
                        disabled={deleteLot.isPending}
                        onClick={() => onDelete(l.id, l.lot_code)}
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
