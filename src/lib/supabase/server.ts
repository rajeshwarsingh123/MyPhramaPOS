import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key')
)

// Check if service role key is available
export const hasServiceRoleKey = !!(
  supabaseServiceRoleKey &&
  !supabaseServiceRoleKey.includes('your-service-role-key')
)

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Not configured — falling back to local database authentication.\n' +
    'To enable Supabase Auth, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  )
}

// Server-side Supabase client using service role key (bypasses RLS, can do admin operations)
// This is safe because it only runs server-side, never exposed to the browser
export const supabase: SupabaseClient = hasServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

// Separate admin client (always service role, for explicit admin operations)
export const adminSupabase: SupabaseClient | null = hasServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

// Anon-key client — required for signInWithOtp and verifyOtp (these APIs reject service-role auth)
export const anonSupabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

if (isSupabaseConfigured && !hasServiceRoleKey) {
  console.warn(
    '[Supabase] Service role key not configured. Some features may not work.'
  )
}
