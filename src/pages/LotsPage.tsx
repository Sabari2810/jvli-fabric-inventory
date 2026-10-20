import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  useAddDrop,
  useAddLot,
  useDeleteLot,
  useDrops,
  useLots,
  useSetLotDrop,
  useUpdateLot,
} from '../lib/queries'
import { meters, rupees, shortDate, todayISO } from '../lib/format'
import { fileToWebpDataUrl } from '../lib/image'
import type { FabricLot, Purpose } from '../lib/types'
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
  Thumb,
  dangerLink,
  inputClass,
  linkButton,
  primaryButton,
  subtleButton,
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
  drop_id: string
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
  drop_id: '',
})

export function LotsPage({ editId }: { editId?: string }) {
  const { data, isLoading, error } = useLots()
  const addLot = useAddLot()
  const updateLot = useUpdateLot()
  const drops = useDrops()
  const addDrop = useAddDrop()
  const setLotDrop = useSetLotDrop()
  const deleteLot = useDeleteLot()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  function startAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setImage(null)
    setFormError(null)
    setOpen(true)
  }

  function startEdit(l: FabricLot) {
    setEditingId(l.id)
    setFormError(null)
    setImage(l.image_data ?? null)
    setForm({
      purchase_date: l.purchase_date,
      supplier: l.supplier ?? '',
      fabric_name: l.fabric_name,
      color: l.color ?? '',
      meters_bought: String(l.meters_bought),
      rate_per_meter: String(l.rate_per_meter),
      purpose: l.purpose,
      low_stock_meters: String(l.low_stock_meters),
      notes: l.notes ?? '',
      drop_id: l.drop_id ?? '',
    })
    setOpen(true)
  }

  // Arriving from "Edit purchase" on the stock page opens that purchase once.
  const opened = useRef(false)
  useEffect(() => {
    if (!editId || opened.current || !data) return
    const lot = data.find((l) => l.id === editId)
    if (lot) {
      opened.current = true
      startEdit(lot)
    }
  }, [editId, data])

  async function handleImageFile(file: File) {
    setFormError(null)
    setConverting(true)
    try {
      setImage(await fileToWebpDataUrl(file))
    } catch (err) {
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

  // Paste an image from the clipboard while the form is open (Ctrl/Cmd+V).
  const pasteHandler = useRef(handleImageFile)
  pasteHandler.current = handleImageFile
  useEffect(() => {
    if (!open) return
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
  }, [open])

  async function onNewDrop() {
    const name = window.prompt('Name of the new drop (for example, October Drop)')?.trim()
    if (!name) return
    setFormError(null)
    try {
      const d = await addDrop.mutateAsync(name)
      set('drop_id', d.id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the drop.')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const bought = Number(form.meters_bought)
    if (!form.fabric_name.trim()) return setFormError('Enter the fabric name.')
    if (!Number.isFinite(bought) || bought <= 0) return setFormError('Meters bought must be more than 0.')

    try {
      const payload = {
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
        drop_id: form.drop_id || null,
      }
      if (editingId) await updateLot.mutateAsync({ id: editingId, patch: payload })
      else await addLot.mutateAsync(payload)
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the purchase.')
    }
  }

  function onDelete(id: string, name: string) {
    if (!window.confirm(`Delete the purchase of ${name}? This cannot be undone.`)) return
    deleteLot.mutate(id)
  }

  const lots = data ?? []
  const saving = addLot.isPending || updateLot.isPending

  return (
    <>
      <PageHeader
        title="Purchases"
        subtitle="Every fabric you buy. Usage is logged against these."
        action={
          <button type="button" className={primaryButton} onClick={startAdd}>
            <Icon name="plus" className="h-4 w-4" />
            Add purchase
          </button>
        }
      />

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
          <EmptyState
            title="No purchases yet"
            body="Add the first fabric you bought and it will show up here and on the stock page."
            action={
              <button type="button" className={primaryButton} onClick={startAdd}>
                Add purchase
              </button>
            }
          />
        ) : null}
        {lots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead>
                <tr>
                  <Th />
                  <Th>Fabric</Th>
                  <Th>Drop</Th>
                  <Th>Bought for</Th>
                  <Th align="right">Meters</Th>
                  <Th align="right">Rate</Th>
                  <Th align="right">Total</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {lots.map((l) => (
                  <tr key={l.id} className="transition hover:bg-stone-50/70">
                    <Td>
                      <Thumb src={l.image_data} name={l.fabric_name} />
                    </Td>
                    <Td>
                      <p className="font-semibold text-ink">{l.fabric_name}</p>
                      <p className="text-xs text-stone-500">
                        {[l.color, l.supplier, shortDate(l.purchase_date)].filter(Boolean).join(', ')}
                      </p>
                    </Td>
                    <Td>
                      <select
                        aria-label="Drop"
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-700"
                        value={l.drop_id ?? ''}
                        disabled={setLotDrop.isPending}
                        onChange={(e) => setLotDrop.mutate({ id: l.id, dropId: e.target.value || null })}
                      >
                        <option value="">No drop</option>
                        {(drops.data ?? []).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      <Badge tone={l.purpose === 'sample' ? 'blue' : 'maroon'}>
                        {l.purpose === 'sample' ? 'Sample' : 'Production'}
                      </Badge>
                    </Td>
                    <Td align="right">{meters(l.meters_bought)}</Td>
                    <Td align="right">{rupees(l.rate_per_meter)}</Td>
                    <Td align="right" className="font-semibold">
                      {rupees(Number(l.meters_bought) * Number(l.rate_per_meter))}
                    </Td>
                    <Td align="right" className="whitespace-nowrap">
                      <button type="button" className={`${linkButton} mr-4`} onClick={() => startEdit(l)}>
                        Edit
                      </button>
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

      <Drawer
        open={open}
        title={editingId ? 'Edit purchase' : 'Add purchase'}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-stone-700">Photo</span>
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
              {image ? (
                <img src={image} alt="Fabric preview" className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white text-stone-400">
                  <Icon name="image" className="h-8 w-8" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickImage}
                  className="sr-only"
                  id="lot-photo"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="lot-photo" className={`${subtleButton} cursor-pointer`}>
                    {image ? 'Change photo' : 'Choose photo'}
                  </label>
                  {image ? (
                    <button type="button" className={dangerLink} onClick={() => setImage(null)}>
                      Remove
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  {converting ? 'Converting to WebP' : 'Or paste an image with Ctrl+V (Cmd+V on Mac).'}
                </p>
              </div>
            </div>
          </div>

          <Field label="Fabric name">
            <input
              required
              autoFocus
              placeholder="Cotton, rayon, chanderi"
              className={inputClass}
              value={form.fabric_name}
              onChange={(e) => set('fabric_name', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
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
            <Field label="Purchase date">
              <input
                type="date"
                required
                className={inputClass}
                value={form.purchase_date}
                onChange={(e) => set('purchase_date', e.target.value)}
              />
            </Field>
            <Field label="Bought for">
              <select
                className={inputClass}
                value={form.purpose}
                onChange={(e) => set('purpose', e.target.value as Purpose)}
              >
                <option value="production">Production</option>
                <option value="sample">Sample</option>
              </select>
            </Field>
          </div>

          <Field label="Drop" hint="Group this fabric with the others for a launch.">
            <div className="flex gap-2">
              <select
                className={inputClass}
                value={form.drop_id}
                onChange={(e) => set('drop_id', e.target.value)}
              >
                <option value="">No drop</option>
                {(drops.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button type="button" className={`${subtleButton} shrink-0`} onClick={() => void onNewDrop()}>
                New drop
              </button>
            </div>
          </Field>
          <Field label="Warn me when meters left drops to" hint="Shows a Running low tag on the stock page.">
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
          <Field label="Notes">
            <input
              placeholder="Bill number, quality remarks"
              className={inputClass}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>

          <ErrorNote message={formError} />
          <div className="flex gap-3 border-t border-stone-100 pt-5">
            <button type="submit" disabled={saving || converting} className={primaryButton}>
              {saving ? 'Saving' : editingId ? 'Save changes' : 'Add purchase'}
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
