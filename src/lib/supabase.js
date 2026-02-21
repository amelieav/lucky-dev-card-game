import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const fallbackUrl = 'http://localhost:54321'
const fallbackAnonKey = 'public-anon-key'
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey)

if (!hasSupabaseEnv) {
  const message = 'Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

  if (import.meta.env.DEV) {
    // Local dev can still use Supabase CLI defaults if desired.
    console.warn(`${message} Falling back to local Supabase at ${fallbackUrl}.`)
  } else {
    throw new Error(message)
  }
}

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackAnonKey,
)
