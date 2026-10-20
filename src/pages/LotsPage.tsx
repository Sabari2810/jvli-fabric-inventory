import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAddLot, useDeleteLot, useLots } from '../lib/queries'
import { meters, rupees, shortDate, todayISO } from '../lib/format'
import { fileToWebpDataUrl } from '../lib/image'
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
  const [image, setImage] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  async function handleImageFile(file: File) {
    setFormError(null)
    setConverting(true)
    try {
      setImage(await fileToWebpDataUrl(file))
    } catch (err) {
      setImage(null)
      setFormError(err instanceof Error ? err.message : 'Could not read that image.')
    } finally {
      setConverting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleImageFile(file)
  }

  // Paste an image from the clipboard anywhere on this page (Ctrl/Cmd+V).
  const pasteHandler = useRef(handleImageFile)
  pasteHandler.current = handleImageFile
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? [])
      const item = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (!file) return
      e.preventDefault()
      void pasteHandler.current(file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

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
        image_data: image,
      })
      setForm(emptyForm())
      setImage(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the purchase.')
    }
  }

  function onDelete(id: string, code: string) {
    if (!window.confirm(`Delete the purchase of ${code}? This cannot be undone.`)) return
    deleteLot.mutate(id)
  }

  const lots = data ?? []

  return (
    <>
      <PageHeader
        title="Fabric purchases"
        subtitle="Record each fabric you buy. Usage is logged against these purchases."
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
            <Field label="Fabric photo" hint="Choose a file, or paste an image anywhere on this page (Ctrl+V / Cmd+V). Converted to WebP before saving." className="sm:col-span-2 lg:col-span-4">
              <div className="flex items-center gap-4">
                {image ? (
                  <img src={image} alt="Fabric preview" className="h-16 w-16 rounded-lg border border-stone-200 object-cover" />
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickImage}
                  className="block w-full text-sm text-stone-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-maroon-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-maroon-900 hover:file:bg-maroon-100"
                />
                {image ? (
                  <button type="button" className={dangerLink} onClick={() => setImage(null)}>
                    Remove
                  </button>
                ) : null}
              </div>
              {converting ? <span className="mt-1 block text-xs text-stone-500">Converting</span> : null}
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
            <button type="submit" disabled={addLot.isPending || converting} className={primaryButton}>
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
          <EmptyState title="No purchases yet" body="Your saved purchases will show up here." />
        ) : null}
        {lots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <Th />
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
                      {l.image_data ? (
                        <img src={l.image_data} alt={l.fabric_name} className="h-12 w-12 rounded-lg border border-stone-200 object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg border border-dashed border-stone-200 bg-stone-50" />
                      )}
                    </Td>
                    <Td>
                      <p className="text-stone-900">{l.fabric_name}</p>
                      <p className="text-xs text-stone-500">
                        {l.color || 'No color'} | {shortDate(l.purchase_date)}
                      </p>
                    </Td>
                    <Td className="text-stone-600">{l.supplier || '-'}</Td>
                    <Td>
                      <Badge tone={l.purpose === 'sample' ? 'blue' : 'maroon'}>
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
                        onClick={() => onDelete(l.id, l.fabric_name)}
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
