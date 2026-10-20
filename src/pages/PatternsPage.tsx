import { useMemo, useState, type FormEvent } from 'react'
import {
  useCanEdit,
  useDeletePattern,
  useDropStyles,
  usePatterns,
  useSavePattern,
} from '../lib/queries'
import type { Pattern } from '../lib/types'
import { PhotoField } from '../components/PhotoField'
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
  Thumb,
  inputClass,
  primaryButton,
  subtleButton,
} from '../components/ui'

export function PatternsPage() {
  const patterns = usePatterns()
  const styles = useDropStyles()
  const save = useSavePattern()
  const del = useDeletePattern()
  const canEdit = useCanEdit()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Pattern | null>(null)
  const [no, setNo] = useState('')
  const [fabricUsage, setFabricUsage] = useState('')
  const [liningUsage, setLiningUsage] = useState('')
  const [notes, setNotes] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usedIn = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const s of styles.data ?? []) {
      const set = map.get(s.pattern_id) ?? new Set<string>()
      set.add(s.drop_id)
      map.set(s.pattern_id, set)
    }
    return map
  }, [styles.data])

  function openForm(p: Pattern | null) {
    setEditing(p)
    setNo(p?.pattern_no ?? '')
    setFabricUsage(p ? String(p.fabric_usage_m) : '')
    setLiningUsage(p ? String(p.lining_usage_m) : '')
    setNotes(p?.notes ?? '')
    setImage(p?.image_data ?? null)
    setError(null)
    setOpen(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const value = no.trim()
    if (!value) return setError('Enter the pattern number.')
    try {
      await save.mutateAsync({
        id: editing?.id,
        input: {
          pattern_no: value,
          image_data: image,
          fabric_usage_m: Number(fabricUsage) || 0,
          lining_usage_m: Number(liningUsage) || 0,
          notes: notes.trim() || null,
        },
      })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the pattern.')
    }
  }

  function onDelete(p: Pattern) {
    if (!window.confirm(`Delete pattern ${p.pattern_no}?`)) return
    del.mutate(p.id)
  }

  const rows = patterns.data ?? []

  return (
    <>
      <PageHeader
        title="Patterns"
        subtitle="Each pattern is defined once and reused in every drop."
        action={
          canEdit ? (
            <button type="button" className={primaryButton} onClick={() => openForm(null)}>
              <Icon name="plus" className="h-4 w-4" />
              Add pattern
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
        <ul className="grid grid-cols-1 gap-3 md:hidden">
          {rows.map((p) => (
            <li
              key={p.id}
              onClick={canEdit ? () => openForm(p) : undefined}
              className={`flex gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 ${canEdit ? 'cursor-pointer active:bg-stone-50' : ''}`}
            >
              <Thumb src={p.image_data} name={p.pattern_no} className="h-28 w-20" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold text-ink">{p.pattern_no}</p>
                    <p className="text-xs text-stone-500">
                      Used in {usedIn.get(p.id)?.size ?? 0} {(usedIn.get(p.id)?.size ?? 0) === 1 ? 'drop' : 'drops'}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
                      <IconButton icon="edit" label="Edit pattern" onClick={() => openForm(p)} />
                      <IconButton icon="trash" label="Delete pattern" danger onClick={() => onDelete(p)} />
                    </div>
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-stone-200/80 text-center">
                  <div className="bg-stone-50 py-2">
                    <dt className="text-xs text-stone-500">Fabric</dt>
                    <dd className="whitespace-nowrap text-sm font-semibold tabular-nums">{p.fabric_usage_m} m</dd>
                  </div>
                  <div className="bg-stone-50 py-2">
                    <dt className="text-xs text-stone-500">Lining</dt>
                    <dd className="whitespace-nowrap text-sm font-semibold tabular-nums">{p.lining_usage_m} m</dd>
                  </div>
                </dl>
                {p.notes ? <p className="mt-2 text-xs text-stone-600">{p.notes}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Card className={rows.length > 0 ? 'hidden md:block' : ''}>
        {patterns.isLoading ? <Loading /> : null}
        {patterns.error ? (
          <div className="p-4">
            <ErrorNote message={patterns.error.message} />
          </div>
        ) : null}
        {!patterns.isLoading && !patterns.error && rows.length === 0 ? (
          <EmptyState
            title="No patterns yet"
            body="Add a pattern like LK01 with its picture and usual meters. Importing a drop's styles creates them for you."
            action={
              canEdit ? (
                <button type="button" className={primaryButton} onClick={() => openForm(null)}>
                  Add pattern
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
                  <Th />
                  <Th>Pattern</Th>
                  <Th align="right">Fabric (m)</Th>
                  <Th align="right">Lining (m)</Th>
                  <Th align="right">Used in drops</Th>
                  <Th>Notes</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((p) => (
                  <tr key={p.id} className="transition hover:bg-stone-50/70">
                    <Td>
                      <Thumb src={p.image_data} name={p.pattern_no} className="h-16 w-12" />
                    </Td>
                    <Td className="font-semibold text-ink">{p.pattern_no}</Td>
                    <Td align="right">{p.fabric_usage_m}</Td>
                    <Td align="right">{p.lining_usage_m}</Td>
                    <Td align="right">{usedIn.get(p.id)?.size ?? 0}</Td>
                    <Td className="max-w-xs truncate text-stone-600">{p.notes || '-'}</Td>
                    <Td align="right" className="whitespace-nowrap">
                      {canEdit ? (
                        <>
                          <IconButton icon="edit" label="Edit pattern" onClick={() => openForm(p)} />
                          <IconButton icon="trash" label="Delete pattern" danger onClick={() => onDelete(p)} />
                        </>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Drawer open={open && canEdit} title={editing ? 'Edit pattern' : 'Add pattern'} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-5">
          <PhotoField
            label="Picture"
            inputId="pattern-photo"
            value={image}
            onChange={setImage}
            onError={setError}
            active={open}
            onBusy={setBusy}
          />
          <Field label="Pattern number">
            <input
              autoFocus
              required
              placeholder="LK01"
              className={inputClass}
              value={no}
              onChange={(e) => setNo(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Usual fabric (m)">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className={inputClass}
                value={fabricUsage}
                onChange={(e) => setFabricUsage(e.target.value)}
              />
            </Field>
            <Field label="Usual lining (m)">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className={inputClass}
                value={liningUsage}
                onChange={(e) => setLiningUsage(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes">
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <ErrorNote message={error} />
          <div className="flex gap-3 border-t border-stone-100 pt-5">
            <button type="submit" disabled={save.isPending || busy} className={primaryButton}>
              {save.isPending ? 'Saving' : editing ? 'Save changes' : 'Add pattern'}
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
