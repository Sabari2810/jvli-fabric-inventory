export type Purpose = 'sample' | 'production'
export type UsageType = 'sample' | 'actual'

export interface FabricLot {
  id: string
  lot_code: string
  purchase_date: string
  supplier: string | null
  fabric_name: string
  color: string | null
  meters_bought: number
  rate_per_meter: number
  purpose: Purpose
  low_stock_meters: number
  notes: string | null
  image_data?: string | null
  drop_id?: string | null
  created_at: string
}

export interface FabricStock extends FabricLot {
  total_cost: number
  meters_sample: number
  meters_actual: number
  meters_wastage: number
  meters_left: number
}

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
    lot_code: string
    fabric_name: string
    color: string | null
    rate_per_meter: number
  } | null
}

export interface Drop {
  id: string
  name: string
  created_at: string
}

export type NewLot = Omit<FabricLot, 'id' | 'lot_code' | 'created_at'>

export type NewUsage = Omit<FabricUsage, 'id' | 'created_at' | 'fabric_lots'>
