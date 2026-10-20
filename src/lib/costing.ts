import type { DropStyle } from './types'

type Costs = Pick<
  DropStyle,
  | 'fabric_usage_m'
  | 'fabric_rate'
  | 'lining_usage_m'
  | 'lining_rate'
  | 'stitching'
  | 'misc'
  | 'profit'
  | 'shipping'
>

/** GST is 5% when the price before GST is 2500 or less, and 18% above that. */
export function gstRate(base: number): number {
  return base <= 2500 ? 0.05 : 0.18
}

/** Costing as in the November drop sheet, except GST is worked out instead of typed in. */
export function costing(s: Costs) {
  const fabric = Number(s.fabric_usage_m) * Number(s.fabric_rate)
  const lining = Number(s.lining_usage_m) * Number(s.lining_rate)
  const raw = fabric + lining
  const base = raw + Number(s.stitching) + Number(s.misc) + Number(s.profit) + Number(s.shipping)
  const rate = gstRate(base)
  const gst = Math.round(base * rate)
  return { fabric, lining, raw, base, rate, gst, mrp: base + gst }
}
