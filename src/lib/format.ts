const meterFormat = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const rupeeFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function meters(value: number | string | null | undefined): string {
  return `${meterFormat.format(Number(value ?? 0))} m`
}

export function plain(value: number | string | null | undefined): string {
  return meterFormat.format(Number(value ?? 0))
}

export function rupees(value: number | string | null | undefined): string {
  return rupeeFormat.format(Number(value ?? 0))
}

export function shortDate(value: string): string {
  const d = new Date(`${value}T00:00:00`)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function todayISO(): string {
  const d = new Date()
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

/** Items are counted in meters (fabric) or in pieces (ready-made items such as dupatta). */
export type Unit = 'm' | 'pcs'

/** "12.5 m" or "12 pcs", by the item's unit. */
export function qty(value: number | string | null | undefined, unit: Unit | null | undefined = 'm'): string {
  return `${meterFormat.format(Number(value ?? 0))} ${unit === 'pcs' ? 'pcs' : 'm'}`
}

/** Short unit name, for hints and labels. */
export function unitName(unit: Unit | null | undefined): string {
  return unit === 'pcs' ? 'pcs' : 'm'
}

/** A total over items counted in different units: "120 m", "40 pcs" or "120 m and 40 pcs". */
export function qtyMix(m: number, p: number): string {
  if (!p) return qty(m, 'm')
  if (!m) return qty(p, 'pcs')
  return `${qty(m, 'm')} and ${qty(p, 'pcs')}`
}
