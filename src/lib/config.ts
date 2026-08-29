const configuredClientId = import.meta.env.VITE_DERIV_CLIENT_ID
const configuredAppId = import.meta.env.VITE_DERIV_APP_ID
const configuredRedirectUri = import.meta.env.VITE_DERIV_REDIRECT_URI

export const DERIV_CLIENT_ID = configuredClientId || configuredAppId || '345QrTfSovbsufMvbf71l'
export const DERIV_APP_ID = configuredAppId || '345QrTfSovbsufMvbf71l'

export const OPTIONS_API_BASE = 'https://api.derivws.com/trading/v1/options'
export const PUBLIC_WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public'

function buildRedirectUri(): string {
  if (configuredRedirectUri) return configuredRedirectUri
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/callback`
  }
  return 'https://www.traderkit.pro/callback'
}

export const DERIV_REDIRECT_URI = buildRedirectUri()

export const ADMIN_ACCOUNT_IDS: string[] = (import.meta.env.VITE_ADMIN_ACCOUNT_IDS || '')
  .split(',')
  .map((id: string) => id.trim())
  .filter(Boolean)

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://czmclfzubeugpuomnwnr.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6bWNsZnp1YmV1Z3B1b21ud25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzAzMDIsImV4cCI6MjEwMzYwNjMwMn0.US_1zWw9xNWPgalQfWupk_wJr8YE4nQyqbGSw7jZLws'
