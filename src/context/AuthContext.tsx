import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DerivWS } from '../lib/deriv-ws'
import { buildAuthUrl, clearOAuthState, getStoredCodeVerifier, getStoredOAuthState } from '../lib/oauth'
import { DERIV_CLIENT_ID, DERIV_REDIRECT_URI, OPTIONS_API_BASE, ADMIN_ACCOUNT_IDS } from '../lib/config'
import { supabase } from '../lib/supabase'
import type { DerivSessionAccount } from '../lib/types'

const ACCOUNTS_KEY = 'deriv_accounts'
const SELECTED_ACCOUNT_KEY = 'deriv_selected_account'
const ACCOUNT_TYPE_KEY = 'deriv_account_type'

type AccountType = 'demo' | 'real'

type AuthContextType = {
  accounts: DerivSessionAccount[]
  account: DerivSessionAccount | null
  accountType: AccountType
  ws: DerivWS | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => void
  handleCallback: (params: URLSearchParams) => Promise<void>
  selectAccount: (accountId: string) => Promise<void>
  switchAccount: (accountId: string) => Promise<void>
  switchAccountType: (type: AccountType) => Promise<void>
  enableRealTrading: () => Promise<void>
}

type OAuthTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
}

type OptionsAccount = {
  account_id: string
  currency?: string
  balance?: number | string
  account_type?: string
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
      return typeof candidate.account_id === 'string' && typeof candidate.access_token === 'string'
    })
  } catch {
    return []
  }
}

function getOAuthToken(data: unknown): OAuthTokenResponse {
  if (!data || typeof data !== 'object') throw new Error('Deriv returned an invalid token response.')
  return data as OAuthTokenResponse
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    'Deriv-App-ID': DERIV_CLIENT_ID,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

function isTokenExpired(expiry: number): boolean {
  return Date.now() >= expiry
}

const SESSION_EXPIRED_MESSAGE = 'Your Deriv session has expired. Please sign in again.'

function ensureValidToken(account: DerivSessionAccount): DerivSessionAccount {
  if (isTokenExpired(account.token_expiry)) {
    throw new Error(SESSION_EXPIRED_MESSAGE)
  }
  return account
}

async function fetchAccounts(accessToken: string): Promise<OptionsAccount[]> {
  const res = await fetch(`${OPTIONS_API_BASE}/accounts`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Accounts request failed (${res.status})`)
  }
  const body = await res.json()
  return (body.data || []) as OptionsAccount[]
}

async function createAccount(accessToken: string, accountType: 'demo' | 'real'): Promise<OptionsAccount> {
  const res = await fetch(`${OPTIONS_API_BASE}/accounts`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ currency: 'USD', group: 'row', account_type: accountType }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Account creation failed (${res.status})`)
  }
  const body = await res.json()
  return body.data as OptionsAccount
}

async function fetchOtpUrl(accessToken: string, accountId: string): Promise<string> {
  const res = await fetch(`${OPTIONS_API_BASE}/accounts/${accountId}/otp`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `OTP request failed (${res.status})`)
  }
  const body = await res.json()
  const url: string | undefined = body.data?.url
  if (!url) throw new Error('Deriv did not return a connection URL.')
  return url
}

function toSessionAccount(acct: OptionsAccount, tokens: OAuthTokenResponse): DerivSessionAccount {
  return {
    account_id: acct.account_id,
    currency: acct.currency || 'USD',
    balance: Number(acct.balance || 0),
    account_type: acct.account_type || 'demo',
    access_token: tokens.access_token!,
    token_expiry: Date.now() + (tokens.expires_in || 3600) * 1000,
  }
}

async function connectViaOtp(url: string): Promise<DerivWS> {
  const ws = new DerivWS(url)
  await ws.connect()
  return ws
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<DerivSessionAccount[]>(readStoredAccounts)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => sessionStorage.getItem(SELECTED_ACCOUNT_KEY))
  const [accountType, setAccountType] = useState<AccountType>(() => (sessionStorage.getItem(ACCOUNT_TYPE_KEY) as AccountType) || 'demo')
  const [ws, setWs] = useState<DerivWS | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const account = accounts.find((candidate) => candidate.account_id === selectedAccountId) || accounts[0] || null

  const isAdmin = account ? ADMIN_ACCOUNT_IDS.includes(account.account_id) : false

  const login = useCallback(async () => {
    setError(null)
    const authUrl = await buildAuthUrl()
    window.location.assign(authUrl)
  }, [])

  const logout = useCallback(() => {
    ws?.disconnect()
    setWs(null)
    setAccounts([])
    setSelectedAccountId(null)
    setAccountType('demo')
    sessionStorage.removeItem(ACCOUNTS_KEY)
    sessionStorage.removeItem(SELECTED_ACCOUNT_KEY)
    sessionStorage.removeItem(ACCOUNT_TYPE_KEY)
    clearOAuthState()
  }, [ws])

  const switchAccount = useCallback(async (accountId: string) => {
    const nextAccount = accounts.find((candidate) => candidate.account_id === accountId)
    if (!nextAccount) throw new Error('Account not found.')

    setIsLoading(true)
    setError(null)
    try {
      const refreshed = ensureValidToken(nextAccount)
      const otpUrl = await fetchOtpUrl(refreshed.access_token, refreshed.account_id)
      const nextWs = await connectViaOtp(otpUrl)

      refreshed.ws_url = otpUrl
      ws?.disconnect()
      sessionStorage.setItem(SELECTED_ACCOUNT_KEY, nextAccount.account_id)
      setSelectedAccountId(nextAccount.account_id)
      setAccounts((prev) => prev.map((a) => a.account_id === refreshed.account_id ? refreshed : a))
      setWs(nextWs)
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : 'Unable to switch Deriv accounts.')
      throw switchError
    } finally {
      setIsLoading(false)
    }
  }, [accounts, ws])

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
      const tokens = getOAuthToken(data)
      if (!tokens.access_token) throw new Error('Deriv did not return an access token.')

      let accountList = await fetchAccounts(tokens.access_token)

      const hasDemo = accountList.some((a) => a.account_type === 'demo')
      if (!hasDemo) {
        const demoAcct = await createAccount(tokens.access_token, 'demo')
        accountList = [...accountList, demoAcct]
      }

      const sessionAccounts: DerivSessionAccount[] = accountList.map((a) => toSessionAccount(a, tokens))

      const demoAccount = sessionAccounts.find((a) => a.account_type === 'demo')
      const firstAccount = demoAccount || sessionAccounts[0]
      const otpUrl = await fetchOtpUrl(tokens.access_token, firstAccount.account_id)
      const nextWs = await connectViaOtp(otpUrl)

      firstAccount.ws_url = otpUrl

      ws?.disconnect()
      sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(sessionAccounts))
      sessionStorage.setItem(SELECTED_ACCOUNT_KEY, firstAccount.account_id)
      sessionStorage.setItem(ACCOUNT_TYPE_KEY, 'demo')
      clearOAuthState()
      setAccounts(sessionAccounts)
      setSelectedAccountId(firstAccount.account_id)
      setAccountType('demo')
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

  const selectAccount = useCallback(async (accountId: string) => {
    return switchAccount(accountId)
  }, [switchAccount])

  const switchAccountType = useCallback(async (type: AccountType) => {
    const targetAccount = accounts.find((a) => a.account_type === type)
    if (!targetAccount) {
      setError(`No ${type} account found. ${type === 'real' ? 'Enable real trading first.' : ''}`)
      return
    }
    if (targetAccount.account_id === account?.account_id) return

    setAccountType(type)
    sessionStorage.setItem(ACCOUNT_TYPE_KEY, type)
    await switchAccount(targetAccount.account_id)
  }, [accounts, account?.account_id, switchAccount])

  const enableRealTrading = useCallback(async () => {
    if (!account) return
    setIsLoading(true)
    setError(null)
    try {
      let accountList = await fetchAccounts(account.access_token)
      const hasReal = accountList.some((a) => a.account_type === 'real')
      if (!hasReal) {
        const realAcct = await createAccount(account.access_token, 'real')
        accountList = [...accountList, realAcct]
      }

      const tokens: OAuthTokenResponse = {
        access_token: account.access_token,
        expires_in: Math.floor((account.token_expiry - Date.now()) / 1000),
      }
      const newSession = accountList
        .filter((a) => !accounts.some((existing) => existing.account_id === a.account_id))
        .map((a) => toSessionAccount(a, tokens))

      setAccounts((prev) => [...prev, ...newSession])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable real trading.')
    } finally {
      setIsLoading(false)
    }
  }, [account, accounts])

  useEffect(() => {
    if (!account || ws) return

    let cancelled = false
    try {
      const validated = ensureValidToken(account)
      fetchOtpUrl(validated.access_token, validated.account_id)
        .then(async (otpUrl) => {
          if (cancelled) return
          const nextWs = await connectViaOtp(otpUrl)
          if (cancelled) {
            nextWs.disconnect()
            return
          }
          validated.ws_url = otpUrl
          setAccounts((prev) => prev.map((a) => a.account_id === validated.account_id ? validated : a))
          setWs(nextWs)
        })
        .catch(() => {
          if (cancelled) return
          sessionStorage.removeItem(ACCOUNTS_KEY)
          sessionStorage.removeItem(SELECTED_ACCOUNT_KEY)
          sessionStorage.removeItem(ACCOUNT_TYPE_KEY)
          setAccounts([])
          setSelectedAccountId(null)
          setError(SESSION_EXPIRED_MESSAGE)
        })
    } catch {
      sessionStorage.removeItem(ACCOUNTS_KEY)
      sessionStorage.removeItem(SELECTED_ACCOUNT_KEY)
      sessionStorage.removeItem(ACCOUNT_TYPE_KEY)
      setAccounts([])
      setSelectedAccountId(null)
      setError(SESSION_EXPIRED_MESSAGE)
    }

    return () => { cancelled = true }
  }, [account, ws])

  return (
    <AuthContext.Provider value={{
      accounts,
      account,
      accountType,
      ws,
      isAuthenticated: accounts.length > 0,
      isAdmin,
      isLoading,
      error,
      login,
      logout,
      handleCallback,
      selectAccount,
      switchAccount,
      switchAccountType,
      enableRealTrading,
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
