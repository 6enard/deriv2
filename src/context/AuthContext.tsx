import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { DerivWS } from '../lib/deriv-ws'
import { generatePkce, generateState, buildAuthUrl, storePkce, getStoredPkce, clearPkce } from '../lib/oauth'
import { DERIV_APP_ID, DERIV_REDIRECT_URI, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/config'
import type { DerivAccount } from '../lib/types'

const TOKEN_KEY = 'deriv_access_token'
const ACCOUNT_KEY = 'deriv_account'
const TOKEN_EXPIRY_KEY = 'deriv_token_expiry'

interface AuthContextType {
  token: string | null
  account: DerivAccount | null
  ws: DerivWS | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: () => void
  logout: () => void
  handleCallback: (code: string, state: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY))
  const [account, setAccount] = useState<DerivAccount | null>(() => {
    const stored = sessionStorage.getItem(ACCOUNT_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [ws, setWs] = useState<DerivWS | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(() => {
    setError(null)
    generatePkce().then(({ verifier, challenge }) => {
      const state = generateState()
      storePkce(verifier, state)
      const authUrl = buildAuthUrl(DERIV_APP_ID, DERIV_REDIRECT_URI, challenge, state)
      window.location.href = authUrl
    })
  }, [])

  const logout = useCallback(() => {
    ws?.disconnect()
    setWs(null)
    setToken(null)
    setAccount(null)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(ACCOUNT_KEY)
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY)
  }, [ws])

  const handleCallback = useCallback(async (code: string, state: string) => {
    setIsLoading(true)
    setError(null)

    const stored = getStoredPkce()
    if (!stored || stored.state !== state) {
      setError('State verification failed. Please try connecting again.')
      clearPkce()
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/deriv-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          code,
          code_verifier: stored.verifier,
          client_id: DERIV_APP_ID,
          redirect_uri: DERIV_REDIRECT_URI,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Token exchange failed')
      }

      const data = await response.json()
      const accessToken = data.access_token

      clearPkce()

      const newWs = new DerivWS(DERIV_APP_ID)
      await newWs.connect()

      const authResponse = await newWs.send({ authorize: accessToken })
      const accountInfo = authResponse.authorize

      const accountData: DerivAccount = {
        loginid: accountInfo.loginid,
        currency: accountInfo.currency,
        balance: parseFloat(accountInfo.balance),
        is_virtual: accountInfo.is_virtual === 1,
        fullname: accountInfo.fullname || '',
        email: accountInfo.email || '',
      }

      sessionStorage.setItem(TOKEN_KEY, accessToken)
      sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(accountData))
      const expiry = Date.now() + (data.expires_in || 3600) * 1000 - 60000
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry))

      setToken(accessToken)
      setAccount(accountData)
      setWs(newWs)
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Deriv. Please try again.')
      clearPkce()
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const expiryStr = sessionStorage.getItem(TOKEN_EXPIRY_KEY)
    if (expiryStr && Date.now() > parseInt(expiryStr)) {
      logout()
    }
  }, [logout])

  return (
    <AuthContext.Provider value={{
      token,
      account,
      ws,
      isAuthenticated: !!token,
      isLoading,
      error,
      login,
      logout,
      handleCallback,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
