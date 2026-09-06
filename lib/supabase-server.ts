import 'server-only'
import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_SERVICE_KEY = 'placeholder-service-key'

// Server client - ONLY for server-side operations
// Uses service role key for full database access
// NEVER expose to client-side code
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    FALLBACK_SERVICE_KEY

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}


// Singleton instance for reuse within the same request
let serverClient: ReturnType<typeof createClient> | null = null
