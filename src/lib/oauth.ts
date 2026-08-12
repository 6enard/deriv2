function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length]
  }
  return result
}

export async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64)
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const challenge = base64UrlEncode(hash)
  return { verifier, challenge }
}

export function generateState(): string {
  return generateRandomString(32)
}

export function buildAuthUrl(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string,
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'trade account_manage',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `https://auth.deriv.com/oauth2/auth?${params.toString()}`
}

const PKCE_KEY = 'deriv_pkce'
const STATE_KEY = 'deriv_state'

export function storePkce(verifier: string, state: string): void {
  sessionStorage.setItem(PKCE_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)
}

export function getStoredPkce(): { verifier: string; state: string } | null {
  const verifier = sessionStorage.getItem(PKCE_KEY)
  const state = sessionStorage.getItem(STATE_KEY)
  if (!verifier || !state) return null
  return { verifier, state }
}

export function clearPkce(): void {
  sessionStorage.removeItem(PKCE_KEY)
  sessionStorage.removeItem(STATE_KEY)
}
