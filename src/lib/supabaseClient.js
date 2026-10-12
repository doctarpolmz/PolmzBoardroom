import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Supabase Client Singleton
// ---------------------------------------------------------------------------
// Reads credentials from Vite environment variables. When deploying on Vercel
// or running locally, create a .env file based on .env.example.
// ---------------------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing environment variables. Copy .env.example to .env ' +
    'and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

export default supabase
