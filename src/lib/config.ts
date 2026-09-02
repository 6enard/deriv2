
/*
 * Application configuration
 *
 * Required Vercel environment variables:
 *
 * VITE_DERIV_CLIENT_ID
 * VITE_DERIV_APP_ID
 * VITE_DERIV_REDIRECT_URI
 * VITE_SUPABASE_URL
 * VITE_SUPABASE_ANON_KEY
 * VITE_ADMIN_ACCOUNT_IDS
 */

const configuredClientId =
  import.meta.env.VITE_DERIV_CLIENT_ID?.trim() || ''

const configuredAppId =
  import.meta.env.VITE_DERIV_APP_ID?.trim() || ''

const configuredRedirectUri =
  import.meta.env.VITE_DERIV_REDIRECT_URI?.trim() || ''

const configuredSupabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() || ''

const configuredSupabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

/*
 * Prefer the explicit OAuth client ID.
 *
 * VITE_DERIV_APP_ID is retained for compatibility with
 * other parts of the existing application.
 */
export const DERIV_CLIENT_ID =
  configuredClientId || configuredAppId

/*
 * Kept because other existing files may still import
 * DERIV_APP_ID.
 */
export const DERIV_APP_ID =
  configuredAppId || configuredClientId

export const OPTIONS_API_BASE =
  'https://api.derivws.com/trading/v1/options'

export const PUBLIC_WS_URL =
  'wss://api.derivws.com/trading/v1/options/ws/public'

function buildRedirectUri(): string {
  if (configuredRedirectUri) {
    return configuredRedirectUri
  }

  if (
    typeof window !== 'undefined' &&
    window.location.origin
  ) {
    return `${window.location.origin}/callback`
  }

  return 'https://www.traderkit.pro/callback'
}

export const DERIV_REDIRECT_URI =
  buildRedirectUri()

export const ADMIN_ACCOUNT_IDS: string[] =
  (
    import.meta.env.VITE_ADMIN_ACCOUNT_IDS || ''
  )
    .split(',')
    .map((id: string) => id.trim())
    .filter(Boolean)

/*
 * The Supabase anon key is safe to expose to the browser
 * when Row Level Security and function security are configured
 * correctly.
 *
 * Never put a Supabase service-role key here.
 */
export const SUPABASE_URL =
  configuredSupabaseUrl ||
  'https://czmclfzubeugpuomnwnr.supabase.co'

export const SUPABASE_ANON_KEY =
  configuredSupabaseAnonKey

export function validateDerivConfig(): void {
  const missing: string[] = []

  if (!DERIV_CLIENT_ID) {
    missing.push('VITE_DERIV_CLIENT_ID')
  }

  if (!DERIV_REDIRECT_URI) {
    missing.push('VITE_DERIV_REDIRECT_URI')
  }

  if (!SUPABASE_URL) {
    missing.push('VITE_SUPABASE_URL')
  }

  if (!SUPABASE_ANON_KEY) {
    missing.push('VITE_SUPABASE_ANON_KEY')
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required application configuration: ${missing.join(', ')}`,
    )
  }
}

