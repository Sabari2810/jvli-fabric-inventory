import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

// Placeholders keep the app from crashing on load when env vars are missing.
// The UI shows a setup notice instead (see App.tsx).
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'missing-anon-key',
)
