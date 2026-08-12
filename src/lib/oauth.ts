import { DERIV_APP_ID, DERIV_REDIRECT_URI } from './config'

const STATE_KEY = 'deriv_oauth_state'

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => chars[value % chars.length]).join('')
}

export function buildAuthUrl(): string {
  const state = generateRandomString(32)
  sessionStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    app_id: DERIV_APP_ID,
    l: 'EN',
    brand: 'deriv',
    redirect_uri: DERIV_REDIRECT_URI,
    state,
  })

  return `https://oauth.deriv.com/oauth2/authorize?${params.toString()}`
}

export function getStoredOAuthState(): string | null {
  return sessionStorage.getItem(STATE_KEY)
}

export function clearOAuthState(): void {
  sessionStorage.removeItem(STATE_KEY)
}
