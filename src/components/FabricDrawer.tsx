import { useEffect, useState, type FormEvent } from 'react'
import {
  useAddDrop,
  useAddFabric,
  useAddFabricType,
  useDrops,
  useFabricTypes,
  useUpdateFabric,
} from '../lib/queries'
import type { FabricStock } from '../lib/types'
import { Drawer, ErrorNote, Field, inputClass, primaryButton, subtleButton } from './ui'
import { Combobox } from './Combobox'
import { PhotoField } from './PhotoField'

/** Create a fabric (open with fabric = null) or edit an existing one. */
export function FabricDrawer({
  open,
  fabric,
  onClose,
}: {
  open: boolean
  fabric: FabricStock | null
  onClose: () => void
}) {
  const drops = useDrops()
  const addDrop = useAddDrop()
  const addFabric = useAddFabric()
  const updateFabric = useUpdateFabric()
  const fabricTypes = useFabricTypes()
  const addFabricType = useAddFabricType()

  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [notes, setNotes] = useState('')
  const [dropId, setDropId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [width, setWidth] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(fabric?.fabric_name ?? '')
    setColor(fabric?.color ?? '')
    setNotes(fabric?.notes ?? '')
    setDropId(fabric?.drop_id ?? '')
    setTypeId(fabric?.fabric_type_id ?? '')
    setWidth(fabric?.width_inches != null ? String(fabric.width_inches) : '')
    setImage(fabric?.image_data ?? null)
    setError(null)
  }, [open, fabric])

  async function onNewDrop() {
    const dropName = window.prompt('Name of the new drop (for example, October Drop)')?.trim()
    if (!dropName) return
    setError(null)
    try {
      const d = await addDrop.mutateAsync(dropName)
      setDropId(d.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the drop.')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Enter the fabric name.')
    if (width.trim() && !(Number(width) > 0)) return setError('Width must be a number of inches.')
    const payload = {
      fabric_name: name.trim(),
      color: color.trim() || null,
      notes: notes.trim() || null,
      image_data: image,
      drop_id: dropId || null,
      fabric_type_id: typeId || null,
      width_inches: width.trim() ? Number(width) : null,
    }
    try {
      if (fabric) await updateFabric.mutateAsync({ id: fabric.id, patch: payload })
      else await addFabric.mutateAsync(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the fabric.')
    }
  }

  const saving = addFabric.isPending || updateFabric.isPending

  return (
    <Drawer open={open} title={fabric ? 'Edit fabric' : 'Add fabric'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-5">
        <PhotoField value={image} onChange={setImage} onError={setError} active={open} onBusy={setBusy} />
        <Field label="Fabric name">
          <input
            required
            autoFocus
            placeholder="Cotton, rayon, chanderi"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-[1fr_8rem] gap-4">
          <Field label="Fabric type">
            <Combobox
              value={typeId}
              onChange={setTypeId}
              placeholder="Select a fabric type"
              createLabel="Add fabric type"
              onCreate={async (typeName) => {
                try {
                  const t = await addFabricType.mutateAsync(typeName)
                  setTypeId(t.id)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not add the fabric type.')
                }
              }}
              options={[
                { value: '', label: 'No type' },
                ...(fabricTypes.data ?? []).map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </Field>
          <Field label="Width (inches)">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              placeholder="42"
              className={inputClass}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Color">
          <input placeholder="Indigo" className={inputClass} value={color} onChange={(e) => setColor(e.target.value)} />
        </Field>
        <Field label="Drop" hint="Group this fabric with the others for a launch.">
          <div className="flex gap-2">
            <Combobox
              className="min-w-0 flex-1"
              value={dropId}
              onChange={setDropId}
              options={[
                { value: '', label: 'No drop' },
                ...(drops.data ?? []).map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <button type="button" className={`${subtleButton} shrink-0`} onClick={() => void onNewDrop()}>
              New drop
            </button>
          </div>
        </Field>
        <Field label="Notes">
          <input
            placeholder="Quality remarks"
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <ErrorNote message={error} />
        <div className="flex gap-3 border-t border-stone-100 pt-5">
          <button type="submit" disabled={saving || busy} className={primaryButton}>
            {saving ? 'Saving' : fabric ? 'Save changes' : 'Add fabric'}
          </button>
          <button type="button" className={subtleButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Drawer>
  )
}
