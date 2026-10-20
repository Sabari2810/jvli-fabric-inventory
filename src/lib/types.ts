export type Purpose = 'sample' | 'production'
export type UsageType = 'sample' | 'actual'

export interface Drop {
  id: string
  name: string
  created_at: string
}

/** One fabric, with everything that came in and went out added up (the fabric_stock view). */
export interface FabricStock {
  id: string
  lot_code: string
  fabric_name: string
  color: string | null
  notes: string | null
  image_data: string | null
  drop_id: string | null
  fabric_type_id: string | null
  width_inches: number | null
  created_at: string
  purchase_date: string | null
  supplier: string | null
  purpose: Purpose | null
  low_stock_meters: number
  meters_bought: number
  rate_per_meter: number
  total_cost: number
  meters_sample: number
  meters_actual: number
  meters_wastage: number
  meters_left: number
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  location: string | null
  website: string | null
  notes: string | null
  created_at: string
}

export interface SupplierInput {
  name: string
  phone: string | null
  location: string | null
  website: string | null
  notes: string | null
}

export interface FabricType {
  id: string
  name: string
  created_at: string
}

export interface FabricInput {
  fabric_name: string
  color: string | null
  notes: string | null
  image_data: string | null
  drop_id: string | null
  fabric_type_id: string | null
  width_inches: number | null
}

export interface StockIn {
  id: string
  lot_id: string
  entry_date: string
  meters: number
  rate_per_meter: number
  supplier: string | null
  purpose: Purpose
  notes: string | null
  created_at: string
  fabric_lots: { fabric_name: string; color: string | null } | null
}

export type NewStockIn = Omit<StockIn, 'id' | 'created_at' | 'fabric_lots'>

export interface FabricUsage {
  id: string
  lot_id: string
  usage_date: string
  design_code: string | null
  usage_type: UsageType
  meters_used: number
  wastage_meters: number
  notes: string | null
  created_at: string
  fabric_lots: {
    fabric_name: string
    color: string | null
  } | null
}

export type NewUsage = Omit<FabricUsage, 'id' | 'created_at' | 'fabric_lots'>

export interface Pattern {
  id: string
  pattern_no: string
  image_data: string | null
  fabric_usage_m: number
  lining_usage_m: number
  notes: string | null
  created_at: string
}

export interface PatternInput {
  pattern_no: string
  image_data: string | null
  fabric_usage_m: number
  lining_usage_m: number
  notes: string | null
}

export interface DropStyle {
  id: string
  drop_id: string
  pattern_id: string
  position: number
  fabric_type_id: string | null
  fabric_id: string | null
  width_inches: number | null
  fabric_image: string | null
  reference_image: string | null
  fabric_usage_m: number
  fabric_rate: number
  lining_usage_m: number
  lining_rate: number
  stitching: number
  misc: number
  profit: number
  gst: number
  shipping: number
  planned_qty: number | null
  notes: string | null
  created_at: string
}

export type DropStyleInput = Omit<DropStyle, 'id' | 'created_at'>
