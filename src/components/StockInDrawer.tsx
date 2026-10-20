import { useEffect, useState, type FormEvent } from 'react'
import { useAddStockIn, useAddSupplier, useStock, useSuppliers, useUpdateStockIn } from '../lib/queries'
import { plain, todayISO } from '../lib/format'
import type { Purpose, StockIn } from '../lib/types'
import { Combobox } from './Combobox'
import { Drawer, ErrorNote, Field, inputClass, primaryButton, subtleButton } from './ui'

/** Add a stock in entry (entry = null), optionally for a fabric, or edit an existing entry. */
export function StockInDrawer({
  open,
  entry,
  fabricId,
  onClose,
}: {
  open: boolean
  entry: StockIn | null
  fabricId?: string
  onClose: () => void
}) {
  const stock = useStock()
  const addEntry = useAddStockIn()
  const updateEntry = useUpdateStockIn()
  const suppliers = useSuppliers()
  const addSupplier = useAddSupplier()

  const [lotId, setLotId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [meterValue, setMeterValue] = useState('')
  const [rate, setRate] = useState('')
  const [supplier, setSupplier] = useState('')
  const [purpose, setPurpose] = useState<Purpose>('production')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fabrics = stock.data ?? []

  useEffect(() => {
    if (!open) return
    const lastSupplier = fabrics.find((f) => f.id === (entry?.lot_id ?? fabricId))?.supplier
    setLotId(entry?.lot_id ?? fabricId ?? '')
    setDate(entry?.entry_date ?? todayISO())
    setMeterValue(entry ? String(entry.meters) : '')
    setRate(entry ? String(entry.rate_per_meter) : '')
    setSupplier(entry?.supplier ?? lastSupplier ?? '')
    setPurpose(entry?.purpose ?? 'production')
    setNotes(entry?.notes ?? '')
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, fabricId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const m = Number(meterValue)
    if (!lotId) return setError('Pick the fabric.')
    if (!Number.isFinite(m) || m <= 0) return setError('Meters must be more than 0.')
    const payload = {
      lot_id: lotId,
      entry_date: date,
      meters: m,
      rate_per_meter: Number(rate) || 0,
      supplier: supplier.trim() || null,
      purpose,
      notes: notes.trim() || null,
    }
    try {
      if (entry) await updateEntry.mutateAsync({ id: entry.id, patch: payload })
      else await addEntry.mutateAsync(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the stock in entry.')
    }
  }

  const saving = addEntry.isPending || updateEntry.isPending
  const selected = fabrics.find((f) => f.id === lotId)

  return (
    <Drawer open={open} title={entry ? 'Edit stock in' : 'Stock in'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-5">
        <Field
          label="Fabric"
          hint={selected ? `${plain(selected.meters_left)} m on the shelf now` : 'Add the fabric on the Stock page first.'}
        >
          <Combobox
            value={lotId}
            onChange={setLotId}
            disabled={!!entry}
            placeholder="Select a fabric"
            options={fabrics.map((f) => ({
              value: f.id,
              label: `${f.fabric_name}${f.color ? `, ${f.color}` : ''}`,
              hint: `${plain(f.meters_left)} m left`,
            }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bought for">
            <Combobox
              value={purpose}
              onChange={(v) => setPurpose(v as Purpose)}
              options={[
                { value: 'production', label: 'Production' },
                { value: 'sample', label: 'Sample' },
              ]}
            />
          </Field>
          <Field label="Date">
            <input type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Meters">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              autoFocus
              className={inputClass}
              value={meterValue}
              onChange={(e) => setMeterValue(e.target.value)}
            />
          </Field>
          <Field label="Rate per meter (INR)">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className={inputClass}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Supplier">
          <Combobox
            value={supplier}
            onChange={setSupplier}
            placeholder="Select a supplier"
            createLabel="Add supplier"
            onCreate={async (name) => {
              try {
                const s = await addSupplier.mutateAsync(name)
                setSupplier(s.name)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not add the supplier.')
              }
            }}
            options={[
              { value: '', label: 'No supplier' },
              ...(suppliers.data ?? []).map((s) => ({ value: s.name, label: s.name })),
              ...(supplier && !(suppliers.data ?? []).some((s) => s.name === supplier)
                ? [{ value: supplier, label: supplier }]
                : []),
            ]}
          />
        </Field>
        <Field label="Notes">
          <input
            placeholder="Bill number"
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <ErrorNote message={error} />
        <div className="sticky bottom-0 z-10 -mx-5 flex gap-3 border-t border-stone-100 bg-white px-5 pb-5 pt-4 md:static md:mx-0 md:px-0 md:pb-0 md:pt-5">
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Saving' : entry ? 'Save changes' : 'Add stock in'}
          </button>
          <button type="button" className={subtleButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Drawer>
  )
}
