import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { FabricLot, FabricStock, FabricUsage, NewLot, NewUsage } from './types'

const KEYS = {
  stock: ['stock'] as const,
  lots: ['lots'] as const,
  usage: ['usage'] as const,
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

export function useDeleteLot() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fabric_lots').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') {
          throw new Error('This lot has usage entries. Delete those first.')
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
