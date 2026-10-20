import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type {
  Drop,
  Supplier,
  Pattern,
  PatternInput,
  DropStyle,
  DropStyleInput,
  SupplierInput,
  FabricType,
  FabricInput,
  FabricStock,
  FabricUsage,
  NewStockIn,
  NewUsage,
  StockIn,
} from './types'

const KEYS = {
  stock: ['stock'] as const,
  stockIn: ['stock-in'] as const,
  usage: ['usage'] as const,
  drops: ['drops'] as const,
  suppliers: ['suppliers'] as const,
  fabricTypes: ['fabric-types'] as const,
  patterns: ['patterns'] as const,
  styles: ['drop-styles'] as const,
}

export function useStock() {
  return useQuery({
    queryKey: KEYS.stock,
    queryFn: async (): Promise<FabricStock[]> => {
      const { data, error } = await supabase
        .from('fabric_stock')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as FabricStock[]
    },
  })
}

export function useStockIn() {
  return useQuery({
    queryKey: KEYS.stockIn,
    queryFn: async (): Promise<StockIn[]> => {
      const { data, error } = await supabase
        .from('fabric_stock_in')
        .select('*, fabric_lots(fabric_name, color)')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as StockIn[]
    },
  })
}

export function useUsage() {
  return useQuery({
    queryKey: KEYS.usage,
    queryFn: async (): Promise<FabricUsage[]> => {
      const { data, error } = await supabase
        .from('fabric_usage')
        .select('*, fabric_lots(fabric_name, color)')
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
      queryClient.invalidateQueries({ queryKey: KEYS.stockIn }),
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

export function useSuppliers() {
  return useQuery({
    queryKey: KEYS.suppliers,
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name')
      if (error) throw new Error(error.message)
      return (data ?? []) as Supplier[]
    },
  })
}

export function useAddSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<Supplier> => {
      const { data, error } = await supabase.from('suppliers').insert({ name }).select().single()
      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('suppliers')
            .select('*')
            .ilike('name', name)
            .single()
          if (existing) return existing as Supplier
        }
        throw new Error(error.message)
      }
      return data as Supplier
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.suppliers }),
  })
}

export function useSaveSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, oldName, input }: { id?: string; oldName?: string; input: SupplierInput }) => {
      if (!id) {
        const { error } = await supabase.from('suppliers').insert(input)
        if (error) {
          if (error.code === '23505') throw new Error('A supplier with that name already exists.')
          throw new Error(error.message)
        }
        return
      }
      const { error } = await supabase.from('suppliers').update(input).eq('id', id)
      if (error) {
        if (error.code === '23505') throw new Error('A supplier with that name already exists.')
        throw new Error(error.message)
      }
      // Stock in entries keep the supplier name, so carry a rename over to them.
      if (oldName && oldName !== input.name) {
        const { error: moveError } = await supabase
          .from('fabric_stock_in')
          .update({ supplier: input.name })
          .eq('supplier', oldName)
        if (moveError) throw new Error(moveError.message)
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: KEYS.suppliers })
      await qc.invalidateQueries({ queryKey: KEYS.stockIn })
      await qc.invalidateQueries({ queryKey: KEYS.stock })
    },
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.suppliers }),
  })
}

export function useFabricTypes() {
  return useQuery({
    queryKey: KEYS.fabricTypes,
    queryFn: async (): Promise<FabricType[]> => {
      const { data, error } = await supabase.from('fabric_types').select('*').order('name')
      if (error) throw new Error(error.message)
      return (data ?? []) as FabricType[]
    },
  })
}

export function useAddFabricType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<FabricType> => {
      const { data, error } = await supabase.from('fabric_types').insert({ name }).select().single()
      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await supabase.from('fabric_types').select('*').ilike('name', name).single()
          if (existing) return existing as FabricType
        }
        throw new Error(error.message)
      }
      return data as FabricType
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.fabricTypes }),
  })
}

export function useRenameDrop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('drops').update({ name }).eq('id', id)
      if (error) {
        if (error.code === '23505') throw new Error('A drop with that name already exists.')
        throw new Error(error.message)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.drops }),
  })
}

export function useDeleteDrop() {
  const refresh = useRefreshAll()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drops').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: KEYS.drops })
      await refresh()
    },
  })
}

/* ---------- Fabrics ---------- */

export function useAddFabric() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async (fabric: FabricInput): Promise<string> => {
      const { data, error } = await supabase.from('fabric_lots').insert(fabric).select('id').single()
      if (error) throw new Error(error.message)
      return data.id as string
    },
    onSuccess: refresh,
  })
}

export function useUpdateFabric() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: FabricInput }) => {
      const { error } = await supabase.from('fabric_lots').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}

export function useDeleteFabric() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fabric_lots').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') {
          throw new Error('This fabric has stock out entries. Delete those first.')
        }
        throw new Error(error.message)
      }
    },
    onSuccess: refresh,
  })
}

/* ---------- Stock in ---------- */

export function useAddStockIn() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async (entry: NewStockIn) => {
      const { error } = await supabase.from('fabric_stock_in').insert(entry)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}

export function useUpdateStockIn() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: NewStockIn }) => {
      const { error } = await supabase.from('fabric_stock_in').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}

export function useDeleteStockIn() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fabric_stock_in').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: refresh,
  })
}

/* ---------- Stock out ---------- */

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

/** True once we know the signed-in user is allowed to change data (view-only users are not). */
export function useCanEdit(): boolean {
  const { data } = useQuery({
    queryKey: ['viewer'],
    staleTime: Infinity,
    queryFn: async (): Promise<boolean> => {
      const { data: row, error } = await supabase.from('viewer_users').select('user_id').maybeSingle()
      if (error) throw new Error(error.message)
      return !!row
    },
  })
  return data === false
}

/* ---------- Fabric types ---------- */

export function useRenameFabricType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('fabric_types').update({ name }).eq('id', id)
      if (error) {
        if (error.code === '23505') throw new Error('A fabric type with that name already exists.')
        throw new Error(error.message)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.fabricTypes }),
  })
}

export function useDeleteFabricType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fabric_types').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: KEYS.fabricTypes })
      await qc.invalidateQueries({ queryKey: KEYS.stock })
      await qc.invalidateQueries({ queryKey: KEYS.styles })
    },
  })
}

/* ---------- Patterns ---------- */

export function usePatterns() {
  return useQuery({
    queryKey: KEYS.patterns,
    queryFn: async (): Promise<Pattern[]> => {
      const { data, error } = await supabase.from('patterns').select('*').order('pattern_no')
      if (error) throw new Error(error.message)
      return (data ?? []) as Pattern[]
    },
  })
}

export function useSavePattern() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: PatternInput }): Promise<Pattern> => {
      const q = id
        ? supabase.from('patterns').update(input).eq('id', id).select().single()
        : supabase.from('patterns').insert(input).select().single()
      const { data, error } = await q
      if (error) {
        if (error.code === '23505') throw new Error('A pattern with that number already exists.')
        throw new Error(error.message)
      }
      return data as Pattern
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.patterns }),
  })
}

export function useDeletePattern() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('patterns').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') throw new Error('This pattern is used in a drop. Remove it from those drops first.')
        throw new Error(error.message)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.patterns }),
  })
}

/* ---------- Drop styles ---------- */

export function useDropStyles() {
  return useQuery({
    queryKey: KEYS.styles,
    queryFn: async (): Promise<DropStyle[]> => {
      const { data, error } = await supabase
        .from('drop_styles')
        .select('*')
        .order('position')
        .order('created_at')
      if (error) throw new Error(error.message)
      return (data ?? []) as DropStyle[]
    },
  })
}

export function useSaveStyle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: DropStyleInput }) => {
      const { error } = id
        ? await supabase.from('drop_styles').update(input).eq('id', id)
        : await supabase.from('drop_styles').insert(input)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.styles }),
  })
}

export function useDeleteStyle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drop_styles').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.styles }),
  })
}
