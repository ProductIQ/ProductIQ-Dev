// src/lib/supabase.ts
// Real Supabase client — reads URL + anon key from Vite env vars.
// The anon key is safe to expose to the browser (RLS protects data).
// The backend uses the service_role key server-side; the frontend must
// NEVER have the service_role key.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
      'Auth and direct DB queries will fail. Copy .env.example to .env and fill in values.'
  )
}

export const supabase: SupabaseClient = createClient<never, never>(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
