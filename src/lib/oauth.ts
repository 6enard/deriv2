import { DERIV_APP_ID, DERIV_REDIRECT_URI } from './config'

const STATE_KEY = 'deriv_oauth_state'
const VERIFIER_KEY = 'deriv_oauth_code_verifier'

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => chars[value % chars.length]).join('')
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export async function buildAuthUrl(): Promise<string> {
  const state = generateRandomString(32)
  const verifier = generateRandomString(64)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = toBase64Url(digest)

  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(VERIFIER_KEY, verifier)

  const params = new URLSearchParams({
    client_id: DERIV_APP_ID,
    redirect_uri: DERIV_REDIRECT_URI,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  })

  return `https://oauth.deriv.com/oauth2/authorize?${params.toString()}`
}

export function getStoredOAuthState(): string | null {
  return sessionStorage.getItem(STATE_KEY)
}

export function getStoredCodeVerifier(): string | null {
  return sessionStorage.getItem(VERIFIER_KEY)
}

export function clearOAuthState(): void {
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
}
