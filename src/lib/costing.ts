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
  | 'gst'
  | 'shipping'
>

/** The same calculations as the November drop sheet. */
export function costing(s: Costs) {
  const fabric = Number(s.fabric_usage_m) * Number(s.fabric_rate)
  const lining = Number(s.lining_usage_m) * Number(s.lining_rate)
  const raw = fabric + lining
  const mrp =
    raw + Number(s.stitching) + Number(s.misc) + Number(s.profit) + Number(s.gst) + Number(s.shipping)
  return { fabric, lining, raw, mrp }
}
