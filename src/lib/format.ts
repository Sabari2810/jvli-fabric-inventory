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
