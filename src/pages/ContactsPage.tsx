import { useMemo, useState, type FormEvent } from 'react'
import { useCanEdit, useContacts, useDeleteContact, useSaveContact, useSuppliers } from '../lib/queries'
import { shortDate, todayISO } from '../lib/format'
import type { Contact, ContactInput, ContactStatus } from '../lib/types'
import {
  Badge,
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
  PageHeader,
  Td,
  Th,
  filterClass,
  inputClass,
  linkButton,
  primaryButton,
  subtleButton,
} from '../components/ui'

const CATEGORIES = ['Fabric', 'Dupatta', 'Saree', 'Other']
const SOURCES = ['IndiaMART', 'Google', 'Referral', 'Other']

const STATUSES: { value: ContactStatus; label: string; tone: 'neutral' | 'blue' | 'amber' | 'green' | 'maroon' | 'red' }[] = [
  { value: 'new', label: 'New', tone: 'neutral' },
  { value: 'contacted', label: 'Contacted', tone: 'blue' },
  { value: 'interested', label: 'Interested', tone: 'amber' },
  { value: 'sample', label: 'Sample asked', tone: 'maroon' },
  { value: 'onboarded', label: 'Onboarded', tone: 'green' },
  { value: 'not_fit', label: 'Not a fit', tone: 'red' },
]

function statusInfo(s: ContactStatus) {
  return STATUSES.find((x) => x.value === s) ?? STATUSES[0]
}

function normalizeUrl(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

function allDigits(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '')
}

/** The last 10 digits, so "+91 98400 12345", "098400 12345" and "9840012345" all match. */
function last10(phone: string | null | undefined): string {
  const d = allDigits(phone)
  return d.length >= 10 ? d.slice(-10) : ''
}

function telLink(phone: string): string {
  const d = allDigits(phone)
  return `tel:${phone.trim().startsWith('+') ? '+' : ''}${d}`
}

function waLink(phone: string): string {
  let d = allDigits(phone).replace(/^0+/, '')
  if (d.length === 10) d = `91${d}`
  return `https://wa.me/${d}`
}

const smallButton = `${subtleButton} !px-3 !py-1.5`

function Followup({ c }: { c: Contact }) {
  if (!c.follow_up_date || c.status === 'onboarded' || c.status === 'not_fit') return null
  const due = c.follow_up_date <= todayISO()
  return <Badge tone={due ? 'amber' : 'neutral'}>Follow up {shortDate(c.follow_up_date)}</Badge>
}

function Actions({ c }: { c: Contact }) {
  if (!c.phone) return null
  const number = c.phone
  return (
    <>
      <a href={telLink(number)} className={smallButton}>
        Call
      </a>
      <a href={waLink(number)} target="_blank" rel="noreferrer" className={smallButton}>
        WhatsApp
      </a>
    </>
  )
}

interface FormState {
  name: string
  phone: string
  email: string
  location: string
  address: string
  website: string
  categories: string[]
  products: string
  min_order: string
  source: string
  status: ContactStatus
  follow_up_date: string
  notes: string
}

const EMPTY: FormState = {
  name: '',
  phone: '',
  email: '',
  location: '',
  address: '',
  website: '',
  categories: [],
  products: '',
  min_order: '',
  source: '',
  status: 'new',
  follow_up_date: '',
  notes: '',
}

function toForm(c: Contact | null): FormState {
  if (!c) return EMPTY
  return {
    name: c.name,
    phone: c.phone ?? '',
    email: c.email ?? '',
    location: c.location ?? '',
    address: c.address ?? '',
    website: c.website ?? '',
    categories: c.categories ?? [],
    products: c.products ?? '',
    min_order: c.min_order ?? '',
    source: c.source ?? '',
    status: c.status,
    follow_up_date: c.follow_up_date ?? '',
    notes: c.notes ?? '',
  }
}

const blank = (v: string): string | null => v.trim() || null

export function ContactsPage() {
  const contacts = useContacts()
  const suppliers = useSuppliers()
  const save = useSaveContact()
  const del = useDeleteContact()
  const canEdit = useCanEdit()

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [f, setF] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const all = contacts.data ?? []

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter((c) => {
      if (cat && !c.categories.includes(cat)) return false
      if (status && c.status !== status) return false
      if (source && (c.source ?? '') !== source) return false
      if (!needle) return true
      const hay = [c.name, c.phone, c.email, c.location, c.products, c.notes, c.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const digits = allDigits(needle)
      return hay.includes(needle.replace(/\s+/g, ' ')) || (digits.length >= 3 && hay.replace(/\D/g, '').includes(digits))
    })
  }, [all, q, cat, status, source])

  // Contacts come in from IndiaMART and Google, so the same business often turns up twice.
  const duplicate = useMemo(() => {
    const mine = [last10(f.phone)].filter(Boolean)
    if (mine.length === 0) return null
    const hit = all.find(
      (c) => c.id !== editing?.id && [last10(c.phone)].some((n) => n && mine.includes(n)),
    )
    if (hit) return `This number is already saved for ${hit.name}.`
    const sup = (suppliers.data ?? []).find((s) => mine.includes(last10(s.phone)))
    if (sup) return `This number belongs to your supplier ${sup.name}.`
    return null
  }, [f.phone, all, suppliers.data, editing])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }))
  }

  function openForm(c: Contact | null) {
    setEditing(c)
    setF(toForm(c))
    setError(null)
    setOpen(true)
  }

  function toggleCategory(name: string) {
    setF((prev) => ({
      ...prev,
      categories: prev.categories.includes(name) ? prev.categories.filter((x) => x !== name) : [...prev.categories, name],
    }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!f.name.trim()) return setError('Enter the business or contact name.')
    const input: ContactInput = {
      name: f.name.trim(),
      contact_person: editing?.contact_person ?? null,
      phone: blank(f.phone),
      alt_phone: editing?.alt_phone ?? null,
      email: blank(f.email)?.toLowerCase() ?? null,
      location: blank(f.location),
      address: blank(f.address),
      website: normalizeUrl(f.website),
      categories: f.categories,
      products: blank(f.products),
      min_order: blank(f.min_order),
      source: blank(f.source),
      source_url: editing?.source_url ?? null,
      status: f.status,
      follow_up_date: f.follow_up_date || null,
      notes: blank(f.notes),
    }
    try {
      await save.mutateAsync({ id: editing?.id, input })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the contact.')
    }
  }

  function onDelete(c: Contact) {
    if (!window.confirm(`Delete ${c.name} from contacts? This cannot be undone.`)) return
    del.mutate(c.id)
  }

  const filtering = !!(q || cat || status || source)

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="Potential vendors for fabric, dupattas and sarees, from IndiaMART, Google and referrals."
        action={
          canEdit ? (
            <button type="button" className={primaryButton} onClick={() => openForm(null)}>
              <Icon name="plus" className="h-4 w-4" />
              Add contact
            </button>
          ) : undefined
        }
      />

      {all.length > 0 ? (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <input
            type="search"
            placeholder="Search name, number, city, product"
            className={`${filterClass} col-span-2 sm:w-72`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search contacts"
          />
          <select className={filterClass} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Supplies">
            <option value="">All types</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className={filterClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select className={`${filterClass} col-span-2 sm:col-span-1`} value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source">
            <option value="">All sources</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {all.length > 0 ? (
        <p className="mb-3 text-sm text-stone-500">
          {filtering ? `${rows.length} of ${all.length} contacts` : `${all.length} contact${all.length === 1 ? '' : 's'}`}
        </p>
      ) : null}

      {del.error ? (
        <div className="mb-4">
          <ErrorNote message={del.error.message} />
        </div>
      ) : null}

      {rows.length > 0 ? (
        <MobileList>
          {rows.map((c) => {
            const st = statusInfo(c.status)
            return (
              <MobileItem key={c.id}>
                {canEdit ? (
                  <button
                    type="button"
                    aria-label={`Edit ${c.name}`}
                    onClick={() => openForm(c)}
                    className="absolute inset-0 rounded-2xl"
                  />
                ) : null}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold leading-snug text-ink">{c.name}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {c.location || 'No location yet'}
                    </p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                {c.phone ? (
                  <p className="mt-2 text-sm font-medium tabular-nums text-ink">
                    {c.phone}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {c.categories.map((x) => (
                    <Badge key={x} tone="maroon">
                      {x}
                    </Badge>
                  ))}
                  {c.source ? <span className="text-xs text-stone-500">{c.source}</span> : null}
                  <Followup c={c} />
                </div>
                {c.products ? <p className="mt-2 line-clamp-2 text-sm text-stone-600">{c.products}</p> : null}
                {c.min_order ? <p className="mt-1 text-xs text-stone-500">Min order: {c.min_order}</p> : null}
                <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2">
                  <Actions c={c} />
                  {canEdit ? (
                    <div className="ml-auto flex">
                      <IconButton icon="edit" label="Edit contact" onClick={() => openForm(c)} />
                      <IconButton icon="trash" label="Delete contact" danger onClick={() => onDelete(c)} />
                    </div>
                  ) : null}
                </div>
              </MobileItem>
            )
          })}
        </MobileList>
      ) : null}

      <Card className={rows.length > 0 ? 'hidden md:block' : ''}>
        {contacts.isLoading ? <Loading /> : null}
        {contacts.error ? (
          <div className="p-4">
            <ErrorNote message={contacts.error.message} />
          </div>
        ) : null}
        {!contacts.isLoading && !contacts.error && all.length === 0 ? (
          <EmptyState
            title="No contacts yet"
            body="Save vendors you find on IndiaMART or Google here, so you can call them and track who replied."
            action={
              canEdit ? (
                <button type="button" className={primaryButton} onClick={() => openForm(null)}>
                  Add contact
                </button>
              ) : undefined
            }
          />
        ) : null}
        {!contacts.isLoading && all.length > 0 && rows.length === 0 ? (
          <EmptyState title="No contacts match" body="Try a different search or clear the filters." />
        ) : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Phone</Th>
                  <Th>Location</Th>
                  <Th>Supplies</Th>
                  <Th>Source</Th>
                  <Th>Status</Th>
                  <Th>Follow up</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((c) => {
                  const st = statusInfo(c.status)
                  return (
                    <tr key={c.id} className="align-top transition hover:bg-stone-50/70">
                      <Td>
                        <p className="font-semibold text-ink">{c.name}</p>
                        {c.products ? <p className="mt-1 max-w-xs text-xs text-stone-500">{c.products}</p> : null}
                      </Td>
                      <Td className="whitespace-nowrap text-stone-600">
                        <p className="tabular-nums">{c.phone || '-'}</p>
                        {c.phone ? (
                          <p className="mt-1 flex gap-3">
                            <a href={telLink(c.phone)} className={`${linkButton} text-xs`}>
                              Call
                            </a>
                            <a
                              href={waLink(c.phone)}
                              target="_blank"
                              rel="noreferrer"
                              className={`${linkButton} text-xs`}
                            >
                              WhatsApp
                            </a>
                          </p>
                        ) : null}
                      </Td>
                      <Td className="text-stone-600">{c.location || '-'}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {c.categories.length ? (
                            c.categories.map((x) => (
                              <Badge key={x} tone="maroon">
                                {x}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </div>
                      </Td>
                      <Td className="text-stone-600">
                        {c.source || '-'}
                      </Td>
                      <Td>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <Followup c={c} />
                        {!c.follow_up_date ? <span className="text-stone-400">-</span> : null}
                      </Td>
                      <Td align="right" className="whitespace-nowrap">
                        {canEdit ? (
                          <>
                            <IconButton icon="edit" label="Edit contact" onClick={() => openForm(c)} />
                            <IconButton icon="trash" label="Delete contact" danger onClick={() => onDelete(c)} />
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

      <Drawer open={open && canEdit} title={editing ? 'Edit contact' : 'Add contact'} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Business or contact name">
            <input
              autoFocus={!editing}
              required
              className={inputClass}
              value={f.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              inputMode="tel"
              className={inputClass}
              value={f.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </Field>
          {duplicate ? (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {duplicate} You can still save it.
            </p>
          ) : null}
          <Field label="Email">
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              className={inputClass}
              value={f.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
          <Field label="City and state">
            <input
              placeholder="Surat, Gujarat"
              className={inputClass}
              value={f.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </Field>
          <Field label="Address">
            <textarea
              rows={2}
              className={inputClass}
              value={f.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </Field>
          <Field label="Website">
            <input
              type="text"
              inputMode="url"
              autoCapitalize="none"
              placeholder="www.example.com"
              className={inputClass}
              value={f.website}
              onChange={(e) => set('website', e.target.value)}
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-stone-700">Supplies</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Supplies">
              {CATEGORIES.map((name) => {
                const on = f.categories.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCategory(name)}
                    className={`min-h-10 rounded-lg border px-4 text-sm font-medium transition ${
                      on
                        ? 'border-maroon-900 bg-maroon-900 text-white'
                        : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
          <Field label="What they sell">
            <input
              placeholder="Cotton mulmul, Bagru print, chiffon dupattas"
              className={inputClass}
              value={f.products}
              onChange={(e) => set('products', e.target.value)}
            />
          </Field>
          <Field label="Minimum order">
            <input
              placeholder="50 m, 100 pieces"
              className={inputClass}
              value={f.min_order}
              onChange={(e) => set('min_order', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Found on">
              <select className={inputClass} value={f.source} onChange={(e) => set('source', e.target.value)}>
                <option value="">Choose</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={f.status}
                onChange={(e) => set('status', e.target.value as ContactStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Follow up on">
            <input
              type="date"
              className={inputClass}
              value={f.follow_up_date}
              onChange={(e) => set('follow_up_date', e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={3}
              placeholder="Rates quoted, what they said, samples"
              className={inputClass}
              value={f.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>

          <ErrorNote message={error} />
          <div className="sticky bottom-0 z-10 -mx-5 flex gap-3 border-t border-stone-100 bg-white px-5 pb-5 pt-4 md:static md:mx-0 md:px-0 md:pb-0 md:pt-5">
            <button type="submit" disabled={save.isPending} className={primaryButton}>
              {save.isPending ? 'Saving' : editing ? 'Save changes' : 'Add contact'}
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
