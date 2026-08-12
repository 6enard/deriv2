const configuredAppId = import.meta.env.VITE_DERIV_APP_ID
const configuredRedirectUri = import.meta.env.VITE_DERIV_REDIRECT_URI

export const DERIV_APP_ID = configuredAppId || '345QrTfSovbsufMvbf71l'
export const DERIV_WS_APP_ID = import.meta.env.VITE_DERIV_WS_APP_ID || ''

function buildRedirectUri(): string {
  if (configuredRedirectUri) return configuredRedirectUri
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/`
  }
  return 'https://deriv1.vercel.app/'
}

export const DERIV_REDIRECT_URI = buildRedirectUri()

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://twegszjxmxzcrlyqcrud.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZWdzemp4bXh6Y3JseXFjcnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MDg1ODEsImV4cCI6MjEwMjA4NDU4MX0._V8FxZPkjj-rmY2ggYRjjNUjFj5cSvgaaN_i15FwROY'
