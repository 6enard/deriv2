import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DerivWS } from '../lib/deriv-ws'
import { buildAuthUrl, clearOAuthState, getStoredOAuthState } from '../lib/oauth'
import { DERIV_WS_APP_ID } from '../lib/config'
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
  login: () => void
  logout: () => void
  handleCallback: (params: URLSearchParams) => Promise<void>
  selectAccount: (loginid: string) => Promise<void>
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<DerivSessionAccount[]>(readStoredAccounts)
  const [selectedLoginid, setSelectedLoginid] = useState<string | null>(() => sessionStorage.getItem(SELECTED_ACCOUNT_KEY))
  const [ws, setWs] = useState<DerivWS | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const account = accounts.find((candidate) => candidate.loginid === selectedLoginid) || accounts[0] || null

  const login = useCallback(() => {
    setError(null)
    window.location.assign(buildAuthUrl())
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

      const returnedState = params.get('state')
      const storedState = getStoredOAuthState()
      if (returnedState && storedState && returnedState !== storedState) {
        throw new Error('The Deriv sign-in session could not be verified. Please try again.')
      }

      const nextAccounts: DerivSessionAccount[] = []
      for (let index = 1; index <= 10; index += 1) {
        const token = params.get(`token${index}`)
        const loginid = params.get(`acct${index}`)
        if (!token || !loginid) continue
        nextAccounts.push({
          loginid,
          token,
          currency: params.get(`cur${index}`) || 'USD',
          balance: 0,
          is_virtual: loginid.startsWith('VRTC'),
          fullname: '',
          email: '',
        })
      }

      if (nextAccounts.length === 0) {
        throw new Error('Deriv did not return an account token. Please approve access and try again.')
      }

      const nextWs = await connectToAccount(nextAccounts[0])
      const accountResponse = await nextWs.send({ account_status: 1 })
      const accountStatus = accountResponse.account_status
      if (accountStatus) {
        nextAccounts[0] = {
          ...nextAccounts[0],
          balance: Number(accountStatus.balance || 0),
          currency: accountStatus.currency || nextAccounts[0].currency,
          fullname: accountStatus.fullname || '',
          email: accountStatus.email || '',
        }
      }

      ws?.disconnect()
      sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts))
      sessionStorage.setItem(SELECTED_ACCOUNT_KEY, nextAccounts[0].loginid)
      clearOAuthState()
      setAccounts(nextAccounts)
      setSelectedLoginid(nextAccounts[0].loginid)
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
