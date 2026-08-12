import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DerivWS } from '../lib/deriv-ws'
import { buildAuthUrl, clearOAuthState, getStoredCodeVerifier, getStoredOAuthState } from '../lib/oauth'
import { DERIV_CLIENT_ID, DERIV_REDIRECT_URI, DERIV_WS_APP_ID } from '../lib/config'
import { supabase } from '../lib/supabase'
import type { DerivSessionAccount } from '../lib/types'

const ACCOUNTS_KEY = 'deriv_accounts'
const SELECTED_ACCOUNT_KEY = 'deriv_selected_account'

type AuthContextType = {
  accounts: DerivSessionAccount[]
  account: DerivSessionAccount | null
  ws: DerivWS | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => void
  handleCallback: (params: URLSearchParams) => Promise<void>
  selectAccount: (loginid: string) => Promise<void>
}

type OAuthTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
}

const AuthContext = createContext<AuthContextType | null>(null)

function readStoredAccounts(): DerivSessionAccount[] {
  const stored = sessionStorage.getItem(ACCOUNTS_KEY)
  if (!stored) return []

  try {
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((account): account is DerivSessionAccount => {
      if (!account || typeof account !== 'object') return false
      const candidate = account as Partial<DerivSessionAccount>
      return typeof candidate.loginid === 'string' && typeof candidate.token === 'string'
    })
  } catch {
    return []
  }
}

function connectToAccount(account: DerivSessionAccount): Promise<DerivWS> {
  return new Promise((resolve, reject) => {
    const nextWs = new DerivWS(DERIV_WS_APP_ID || undefined)
    nextWs.connect()
      .then(() => nextWs.send({ authorize: account.token }))
      .then((response) => {
        if (!response.authorize) throw new Error('Deriv did not authorize this account.')
        resolve(nextWs)
      })
      .catch((error: unknown) => {
        nextWs.disconnect()
        reject(error instanceof Error ? error : new Error('Unable to connect to Deriv.'))
      })
  })
}

function getOAuthToken(data: unknown): string {
  if (!data || typeof data !== 'object') throw new Error('Deriv returned an invalid token response.')
  const token = (data as OAuthTokenResponse).access_token
  if (!token) throw new Error('Deriv did not return an access token.')
  return token
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<DerivSessionAccount[]>(readStoredAccounts)
  const [selectedLoginid, setSelectedLoginid] = useState<string | null>(() => sessionStorage.getItem(SELECTED_ACCOUNT_KEY))
  const [ws, setWs] = useState<DerivWS | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const account = accounts.find((candidate) => candidate.loginid === selectedLoginid) || accounts[0] || null

  const login = useCallback(async () => {
    setError(null)
    const authUrl = await buildAuthUrl()
    window.location.assign(authUrl)
  }, [])

  const logout = useCallback(() => {
    ws?.disconnect()
    setWs(null)
    setAccounts([])
    setSelectedLoginid(null)
    sessionStorage.removeItem(ACCOUNTS_KEY)
    sessionStorage.removeItem(SELECTED_ACCOUNT_KEY)
    clearOAuthState()
  }, [ws])

  const handleCallback = useCallback(async (params: URLSearchParams) => {
    setIsLoading(true)
    setError(null)

    try {
      const callbackError = params.get('error_description') || params.get('error')
      if (callbackError) throw new Error(callbackError)

      const code = params.get('code')
      const returnedState = params.get('state')
      const storedState = getStoredOAuthState()
      const codeVerifier = getStoredCodeVerifier()

      if (!code || !returnedState || !storedState || returnedState !== storedState) {
        throw new Error('The Deriv sign-in session could not be verified. Please try again.')
      }
      if (!codeVerifier) throw new Error('The Deriv sign-in session has expired. Please try again.')

      const { data, error: exchangeError } = await supabase.functions.invoke('deriv-oauth', {
        body: {
          code,
          code_verifier: codeVerifier,
          client_id: DERIV_CLIENT_ID,
          redirect_uri: DERIV_REDIRECT_URI,
        },
      })

      if (exchangeError) throw new Error(exchangeError.message || 'Deriv token exchange failed.')
      const token = getOAuthToken(data)
      const nextAccount: DerivSessionAccount = {
        loginid: '',
        token,
        currency: 'USD',
        balance: 0,
        is_virtual: false,
        fullname: '',
        email: '',
      }
      const nextWs = await connectToAccount(nextAccount)
      const authorization = await nextWs.send({ authorize: token })
      const authorizedAccount = authorization.authorize
      if (!authorizedAccount?.loginid) throw new Error('Deriv did not return account information.')

      const authenticatedAccount: DerivSessionAccount = {
        ...nextAccount,
        loginid: authorizedAccount.loginid,
        currency: authorizedAccount.currency || 'USD',
        balance: Number(authorizedAccount.balance || 0),
        is_virtual: Boolean(authorizedAccount.is_virtual),
        fullname: authorizedAccount.fullname || '',
        email: authorizedAccount.email || '',
      }

      ws?.disconnect()
      sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify([authenticatedAccount]))
      sessionStorage.setItem(SELECTED_ACCOUNT_KEY, authenticatedAccount.loginid)
      clearOAuthState()
      setAccounts([authenticatedAccount])
      setSelectedLoginid(authenticatedAccount.loginid)
      setWs(nextWs)
    } catch (callbackError) {
      const message = callbackError instanceof Error ? callbackError.message : 'Unable to complete Deriv sign-in.'
      setError(message)
      clearOAuthState()
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }, [ws])

  const selectAccount = useCallback(async (loginid: string) => {
    const nextAccount = accounts.find((candidate) => candidate.loginid === loginid)
    if (!nextAccount || nextAccount.loginid === account?.loginid) return

    setIsLoading(true)
    setError(null)
    try {
      const nextWs = await connectToAccount(nextAccount)
      ws?.disconnect()
      sessionStorage.setItem(SELECTED_ACCOUNT_KEY, nextAccount.loginid)
      setSelectedLoginid(nextAccount.loginid)
      setWs(nextWs)
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : 'Unable to switch Deriv accounts.')
      throw selectionError
    } finally {
      setIsLoading(false)
    }
  }, [account?.loginid, accounts, ws])

  useEffect(() => {
    if (!account || ws) return
    connectToAccount(account)
      .then(setWs)
      .catch(() => {
        sessionStorage.removeItem(ACCOUNTS_KEY)
        sessionStorage.removeItem(SELECTED_ACCOUNT_KEY)
        setAccounts([])
        setSelectedLoginid(null)
      })
  }, [account, ws])

  return (
    <AuthContext.Provider value={{
      accounts,
      account,
      ws,
      isAuthenticated: accounts.length > 0,
      isLoading,
      error,
      login,
      logout,
      handleCallback,
      selectAccount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
