import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Drop, FabricLot, FabricStock, FabricUsage, NewLot, NewUsage } from './types'

const KEYS = {
  stock: ['stock'] as const,
  lots: ['lots'] as const,
  usage: ['usage'] as const,
  drops: ['drops'] as const,
}

export function useStock() {
  return useQuery({
    queryKey: KEYS.stock,
    queryFn: async (): Promise<FabricStock[]> => {
      const { data, error } = await supabase
        .from('fabric_stock')
        .select('*')
        .order('purchase_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as FabricStock[]
    },
  })
}

export function useLots() {
  return useQuery({
    queryKey: KEYS.lots,
    queryFn: async (): Promise<FabricLot[]> => {
      const { data, error } = await supabase
        .from('fabric_lots')
        .select('*')
        .order('purchase_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as FabricLot[]
    },
  })
}

export function useUsage() {
  return useQuery({
    queryKey: KEYS.usage,
    queryFn: async (): Promise<FabricUsage[]> => {
      const { data, error } = await supabase
        .from('fabric_usage')
        .select('*, fabric_lots(lot_code, fabric_name, color, rate_per_meter)')
        .order('usage_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as FabricUsage[]
    },
  })
}

function useRefreshAll() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: KEYS.stock }),
      queryClient.invalidateQueries({ queryKey: KEYS.lots }),
      queryClient.invalidateQueries({ queryKey: KEYS.usage }),
    ])
}

export function useDrops() {
  return useQuery({
    queryKey: KEYS.drops,
    queryFn: async (): Promise<Drop[]> => {
      const { data, error } = await supabase
        .from('drops')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Drop[]
    },
  })
}

export function useAddDrop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<Drop> => {
      const { data, error } = await supabase.from('drops').insert({ name }).select().single()
      if (error) {
        if (error.code === '23505') throw new Error('A drop with that name already exists.')
        throw new Error(error.message)
      }
      return data as Drop
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.drops }),
  })
}

export function useAddLot() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async (lot: NewLot) => {
      const { error } = await supabase.from('fabric_lots').insert(lot)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}

export function useUpdateLot() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: NewLot }) => {
      const { error } = await supabase.from('fabric_lots').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}

export function useAddMeters() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async ({ id, meters, rate }: { id: string; meters: number; rate: number }) => {
      const { data: lot, error: readError } = await supabase
        .from('fabric_lots')
        .select('meters_bought, rate_per_meter')
        .eq('id', id)
        .single()
      if (readError) throw new Error(readError.message)
      const bought = Number(lot.meters_bought)
      const total = bought + meters
      // Keep the rate as the average price paid per meter across both buys.
      const average = (bought * Number(lot.rate_per_meter) + meters * rate) / total
      const { error } = await supabase
        .from('fabric_lots')
        .update({ meters_bought: total, rate_per_meter: Math.round(average * 100) / 100 })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}

export function useUpdateUsage() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: NewUsage }) => {
      const { error } = await supabase.from('fabric_usage').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}

export function useSetLotDrop() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async ({ id, dropId }: { id: string; dropId: string | null }) => {
      const { error } = await supabase.from('fabric_lots').update({ drop_id: dropId }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}

export function useDeleteLot() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fabric_lots').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') {
          throw new Error('This fabric has usage entries. Delete those first.')
        }
        throw new Error(error.message)
      }
    },
    onSuccess: refresh,
  })
}

export function useAddUsage() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async (usage: NewUsage) => {
      const { error } = await supabase.from('fabric_usage').insert(usage)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}

export function useDeleteUsage() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fabric_usage').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}
