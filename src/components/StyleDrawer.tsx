import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAddFabricType, useFabricTypes, usePatterns, useSaveStyle, useStock } from '../lib/queries'
import { costing } from '../lib/costing'
import { rupees } from '../lib/format'
import type { DropStyle } from '../lib/types'
import { Combobox } from './Combobox'
import { PhotoField } from './PhotoField'
import { Drawer, ErrorNote, Field, inputClass, primaryButton, subtleButton } from './ui'

const num = (v: string) => (v === '' ? 0 : Number(v))
const show = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

export function StyleDrawer({
  open,
  onClose,
  dropId,
  style,
  nextPosition,
}: {
  open: boolean
  onClose: () => void
  dropId: string
  style: DropStyle | null
  nextPosition: number
}) {
  const patterns = usePatterns()
  const types = useFabricTypes()
  const stock = useStock()
  const save = useSaveStyle()
  const addType = useAddFabricType()

  const [patternId, setPatternId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [width, setWidth] = useState('')
  const [fabricId, setFabricId] = useState('')
  const [swatch, setSwatch] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [f, setF] = useState<Record<string, string>>({})
  const [planned, setPlanned] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPatternId(style?.pattern_id ?? '')
    setTypeId(style?.fabric_type_id ?? '')
    setWidth(show(style?.width_inches))
    setFabricId(style?.fabric_id ?? '')
    setSwatch(style?.fabric_image ?? null)
    setReference(style?.reference_image ?? null)
    setF({
      fabric_usage_m: show(style?.fabric_usage_m),
      fabric_rate: show(style?.fabric_rate),
      lining_usage_m: show(style?.lining_usage_m),
      lining_rate: show(style?.lining_rate),
      stitching: show(style?.stitching),
      misc: show(style?.misc),
      profit: show(style?.profit),
      gst: show(style?.gst),
      shipping: show(style?.shipping),
    })
    setPlanned(show(style?.planned_qty))
    setNotes(style?.notes ?? '')
    setError(null)
  }, [open, style])

  const patternOptions = (patterns.data ?? []).map((p) => ({ value: p.id, label: p.pattern_no }))
  const typeOptions = (types.data ?? []).map((t) => ({ value: t.id, label: t.name }))
  const fabricOptions = useMemo(
    () =>
      (stock.data ?? []).map((x) => ({
        value: x.id,
        label: x.fabric_name,
        hint: x.color ?? undefined,
      })),
    [stock.data],
  )

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }))
  const money = (k: string) => num(f[k] ?? '')
  const calc = costing({
    fabric_usage_m: money('fabric_usage_m'),
    fabric_rate: money('fabric_rate'),
    lining_usage_m: money('lining_usage_m'),
    lining_rate: money('lining_rate'),
    stitching: money('stitching'),
    misc: money('misc'),
    profit: money('profit'),
    gst: money('gst'),
    shipping: money('shipping'),
  })

  function pickPattern(id: string) {
    setPatternId(id)
    const p = (patterns.data ?? []).find((x) => x.id === id)
    if (!p) return
    // A new style starts from the pattern's usual meters and picture
    if (!style) {
      setF((prev) => ({
        ...prev,
        fabric_usage_m: prev.fabric_usage_m || show(p.fabric_usage_m),
        lining_usage_m: prev.lining_usage_m || show(p.lining_usage_m),
      }))
    }
  }

  function pickFabric(id: string) {
    setFabricId(id)
    const fab = (stock.data ?? []).find((x) => x.id === id)
    if (!fab) return
    if (fab.fabric_type_id && !typeId) setTypeId(fab.fabric_type_id)
    if (fab.width_inches && !width) setWidth(String(fab.width_inches))
    if (!swatch) setSwatch(fab.image_data)
    if (!f.fabric_rate && fab.rate_per_meter) setF((p) => ({ ...p, fabric_rate: String(fab.rate_per_meter) }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!patternId) return setError('Pick a pattern.')
    try {
      await save.mutateAsync({
        id: style?.id,
        input: {
          drop_id: dropId,
          pattern_id: patternId,
          position: style?.position ?? nextPosition,
          fabric_type_id: typeId || null,
          fabric_id: fabricId || null,
          width_inches: width ? Number(width) : null,
          fabric_image: swatch,
          reference_image: reference,
          fabric_usage_m: money('fabric_usage_m'),
          fabric_rate: money('fabric_rate'),
          lining_usage_m: money('lining_usage_m'),
          lining_rate: money('lining_rate'),
          stitching: money('stitching'),
          misc: money('misc'),
          profit: money('profit'),
          gst: money('gst'),
          shipping: money('shipping'),
          planned_qty: planned ? Number(planned) : null,
          notes: notes.trim() || null,
        },
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the style.')
    }
  }

  const numberField = (key: string, label: string, step = '0.01') => (
    <Field label={label}>
      <input type="number" inputMode="decimal" step={step} min="0" className={inputClass} value={f[key] ?? ''} onChange={set(key)} />
    </Field>
  )

  return (
    <Drawer open={open} title={style ? 'Edit style' : 'Add style'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Pattern">
          <Combobox value={patternId} onChange={pickPattern} options={patternOptions} placeholder="Pick a pattern" />
        </Field>

        <PhotoField
          label="Fabric swatch"
          inputId="style-swatch"
          value={swatch}
          onChange={setSwatch}
          onError={setError}
          active={open}
          onBusy={setBusy}
        />

        <Field label="Fabric from stock" hint="Optional. Links this style to a fabric you already bought.">
          <Combobox value={fabricId} onChange={pickFabric} options={fabricOptions} placeholder="Pick a fabric" />
        </Field>

        <div className="grid grid-cols-[1fr_7rem] gap-4">
          <Field label="Fabric type">
            <Combobox
              value={typeId}
              onChange={setTypeId}
              options={typeOptions}
              placeholder="Pick a type"
              createLabel="Add fabric type"
              onCreate={async (name) => {
                try {
                  setTypeId((await addType.mutateAsync(name)).id)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not add the fabric type.')
                }
              }}
            />
          </Field>
          <Field label="Width (in)">
            <input type="number" inputMode="decimal" min="0" className={inputClass} value={width} onChange={(e) => setWidth(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {numberField('fabric_usage_m', 'Fabric usage (m)')}
          {numberField('fabric_rate', 'Fabric rate per m')}
          {numberField('lining_usage_m', 'Lining usage (m)')}
          {numberField('lining_rate', 'Lining rate per m')}
          {numberField('stitching', 'Stitching')}
          {numberField('misc', 'Misc')}
          {numberField('profit', 'Profit')}
          {numberField('gst', 'GST')}
          {numberField('shipping', 'Shipping')}
          <Field label="Planned pieces">
            <input type="number" inputMode="numeric" min="0" className={inputClass} value={planned} onChange={(e) => setPlanned(e.target.value)} />
          </Field>
        </div>

        <Field label="Notes">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200">
          <div className="bg-stone-50 p-4">
            <dt className="text-xs text-stone-500">Raw material</dt>
            <dd className="mt-0.5 whitespace-nowrap font-display text-lg font-semibold tabular-nums">{rupees(calc.raw)}</dd>
          </div>
          <div className="bg-maroon-50 p-4">
            <dt className="text-xs text-maroon-900/70">MRP</dt>
            <dd className="mt-0.5 whitespace-nowrap font-display text-lg font-semibold tabular-nums text-maroon-900">{rupees(calc.mrp)}</dd>
          </div>
        </dl>

        <ErrorNote message={error} />
        <div className="flex gap-3 border-t border-stone-100 pt-5">
          <button type="submit" disabled={save.isPending || busy} className={primaryButton}>
            {save.isPending ? 'Saving' : style ? 'Save changes' : 'Add style'}
          </button>
          <button type="button" className={subtleButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Drawer>
  )
}
