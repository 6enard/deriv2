
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { DerivWS } from '../lib/deriv-ws'
import {
  buildAuthUrl,
  clearOAuthState,
  getStoredCodeVerifier,
  getStoredOAuthState,
} from '../lib/oauth'
import {
  DERIV_CLIENT_ID,
  DERIV_REDIRECT_URI,
  OPTIONS_API_BASE,
  ADMIN_ACCOUNT_IDS,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../lib/config'
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
  refreshBalance: () => Promise<void>
}

type OAuthTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
}

type OptionsAccount = {
  account_id: string
  currency?: string
  balance?: number | string
  account_type?: string
}

type DerivError = {
  code?: string
  message?: string
  status?: number
}

type DerivErrorResponse = {
  error?: string
  message?: string
  errors?: DerivError[]
}

const AuthContext = createContext<AuthContextType | null>(null)

const SESSION_EXPIRED_MESSAGE =
  'Your Deriv session has expired. Please sign in again.'

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

const MAX_API_RETRIES = 4
const INITIAL_RETRY_DELAY_MS = 600
const REQUEST_TIMEOUT_MS = 15_000

function readStoredAccounts(): DerivSessionAccount[] {
  try {
    const stored = sessionStorage.getItem(ACCOUNTS_KEY)

    if (!stored) {
      return []
    }

    const parsed: unknown = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((account): account is DerivSessionAccount => {
      if (!account || typeof account !== 'object') {
        return false
      }

      const candidate = account as Partial<DerivSessionAccount>

      return (
        typeof candidate.account_id === 'string' &&
        typeof candidate.access_token === 'string'
      )
    })
  } catch {
    return []
  }
}

function getStoredAccountType(): AccountType {
  const stored = sessionStorage.getItem(ACCOUNT_TYPE_KEY)

  return stored === 'real' ? 'real' : 'demo'
}

function getOAuthToken(data: unknown): OAuthTokenResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Deriv returned an invalid token response.')
  }

  return data as OAuthTokenResponse
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    'Deriv-App-ID': DERIV_CLIENT_ID,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

function isTokenExpired(expiry: number): boolean {
  return Date.now() >= expiry - REFRESH_THRESHOLD_MS
}

function getDerivErrorMessage(
  body: unknown,
  fallback: string,
): string {
  if (!body || typeof body !== 'object') {
    return fallback
  }

  const data = body as DerivErrorResponse

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const firstError = data.errors[0]

    if (firstError?.message) {
      if (firstError.code) {
        return `${firstError.message} (${firstError.code})`
      }

      return firstError.message
    }
  }

  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error
  }

  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message
  }

  return fallback
}

function isRetryableStatus(status: number): boolean {
  return (
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504
  )
}

function getRetryDelay(
  attempt: number,
  retryAfterHeader: string | null,
): number {
  if (retryAfterHeader) {
    const retryAfterSeconds = Number(retryAfterHeader)

    if (
      Number.isFinite(retryAfterSeconds) &&
      retryAfterSeconds >= 0
    ) {
      return Math.min(retryAfterSeconds * 1000, 10_000)
    }
  }

  const exponentialDelay =
    INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)

  const jitter = Math.floor(Math.random() * 250)

  return Math.min(exponentialDelay + jitter, 8_000)
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  requestName: string,
): Promise<Response> {
  let lastStatus: number | null = null

  for (let attempt = 0; attempt < MAX_API_RETRIES; attempt += 1) {
    const controller = new AbortController()

    const timeout = window.setTimeout(() => {
      controller.abort()
    }, REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      lastStatus = response.status

      if (response.ok) {
        return response
      }

      if (!isRetryableStatus(response.status)) {
        return response
      }

      if (attempt < MAX_API_RETRIES - 1) {
        const delay = getRetryDelay(
          attempt,
          response.headers.get('Retry-After'),
        )

        await new Promise((resolve) => {
          window.setTimeout(resolve, delay)
        })
      }
    } catch (error) {
      if (attempt >= MAX_API_RETRIES - 1) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          throw new Error(
            `${requestName} timed out. Please check your connection and try again.`,
          )
        }

        if (error instanceof Error) {
          throw error
        }

        throw new Error(`${requestName} failed.`)
      }

      const delay = getRetryDelay(attempt, null)

      await new Promise((resolve) => {
        window.setTimeout(resolve, delay)
      })
    } finally {
      window.clearTimeout(timeout)
    }
  }

  throw new Error(
    `${requestName} failed after ${MAX_API_RETRIES} attempts${
      lastStatus ? ` (${lastStatus})` : ''
    }. Please try again.`,
  )
}

async function callDerivOAuth(
  payload: Record<string, unknown>,
): Promise<OAuthTokenResponse> {
  const res = await fetchWithRetry(
    `${SUPABASE_URL}/functions/v1/deriv-oauth`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    },
    'Deriv authentication request',
  )

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(
      getDerivErrorMessage(
        body,
        `Authentication request failed (${res.status})`,
      ),
    )
  }

  return getOAuthToken(body)
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const tokens = await callDerivOAuth({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: DERIV_CLIENT_ID,
  })

  if (!tokens.access_token) {
    throw new Error(
      'Deriv did not return a refreshed access token.',
    )
  }

  return tokens
}

async function fetchAccounts(
  accessToken: string,
): Promise<OptionsAccount[]> {
  const res = await fetchWithRetry(
    `${OPTIONS_API_BASE}/accounts`,
    {
      method: 'GET',
      headers: authHeaders(accessToken),
    },
    'Deriv accounts request',
  )

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(SESSION_EXPIRED_MESSAGE)
    }

    throw new Error(
      getDerivErrorMessage(
        body,
        `Accounts request failed (${res.status})`,
      ),
    )
  }

  if (!body || typeof body !== 'object') {
    throw new Error(
      'Deriv returned an invalid accounts response.',
    )
  }

  const data = (body as { data?: unknown }).data

  if (!Array.isArray(data)) {
    throw new Error(
      'Deriv returned an invalid accounts list.',
    )
  }

  return data.filter(
    (account): account is OptionsAccount => {
      if (!account || typeof account !== 'object') {
        return false
      }

      const candidate = account as Partial<OptionsAccount>

      return typeof candidate.account_id === 'string'
    },
  )
}

async function createAccount(
  accessToken: string,
  accountType: 'demo' | 'real',
): Promise<OptionsAccount> {
  const res = await fetchWithRetry(
    `${OPTIONS_API_BASE}/accounts`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        currency: 'USD',
        group: 'row',
        account_type: accountType,
      }),
    },
    `Deriv ${accountType} account creation request`,
  )

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(
      getDerivErrorMessage(
        body,
        `Account creation failed (${res.status})`,
      ),
    )
  }

  const data = (body as { data?: unknown }).data

  if (!data || typeof data !== 'object') {
    throw new Error(
      'Deriv returned an invalid account creation response.',
    )
  }

  const account = data as OptionsAccount

  if (!account.account_id) {
    throw new Error(
      'Deriv did not return the new account ID.',
    )
  }

  return account
}

async function fetchOtpUrl(
  accessToken: string,
  accountId: string,
): Promise<string> {
  const res = await fetchWithRetry(
    `${OPTIONS_API_BASE}/accounts/${encodeURIComponent(accountId)}/otp`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
    },
    'Deriv connection request',
  )

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(SESSION_EXPIRED_MESSAGE)
    }

    throw new Error(
      getDerivErrorMessage(
        body,
        `OTP request failed (${res.status})`,
      ),
    )
  }

  const data = (body as { data?: unknown }).data

  if (!data || typeof data !== 'object') {
    throw new Error(
      'Deriv returned an invalid connection response.',
    )
  }

  const url = (data as { url?: unknown }).url

  if (typeof url !== 'string' || !url) {
    throw new Error(
      'Deriv did not return a connection URL.',
    )
  }

  return url
}

function toSessionAccount(
  acct: OptionsAccount,
  tokens: OAuthTokenResponse,
): DerivSessionAccount {
  return {
    account_id: acct.account_id,
    currency: acct.currency || 'USD',
    balance: Number(acct.balance || 0),
    account_type:
      acct.account_type === 'real' ? 'real' : 'demo',
    access_token: tokens.access_token!,
    token_expiry:
      Date.now() + (tokens.expires_in || 3600) * 1000,
    refresh_token: tokens.refresh_token,
  }
}

async function connectViaOtp(url: string): Promise<DerivWS> {
  const ws = new DerivWS(url)

  await ws.connect()

  return ws
}

function saveAccounts(
  nextAccounts: DerivSessionAccount[],
): void {
  sessionStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify(nextAccounts),
  )
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [accounts, setAccounts] =
    useState<DerivSessionAccount[]>(readStoredAccounts)

  const [selectedAccountId, setSelectedAccountId] =
    useState<string | null>(() =>
      sessionStorage.getItem(SELECTED_ACCOUNT_KEY),
    )

  const [accountType, setAccountType] =
    useState<AccountType>(getStoredAccountType)

  const [ws, setWs] = useState<DerivWS | null>(null)

  const [isLoading, setIsLoading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const account =
    accounts.find(
      (candidate) =>
        candidate.account_id === selectedAccountId,
    ) ||
    accounts.find(
      (candidate) =>
        candidate.account_type === accountType,
    ) ||
    accounts[0] ||
    null

  const isAdmin = account
    ? ADMIN_ACCOUNT_IDS.includes(account.account_id)
    : false

  const login = useCallback(async () => {
    setError(null)

    try {
      const authUrl = await buildAuthUrl()

      window.location.assign(authUrl)
    } catch (loginError) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : 'Unable to start Deriv sign-in.'

      setError(message)

      throw new Error(message)
    }
  }, [])

  const logout = useCallback(() => {
    ws?.disconnect()

    setWs(null)
    setAccounts([])
    setSelectedAccountId(null)
    setAccountType('demo')
    setError(null)

    sessionStorage.removeItem(ACCOUNTS_KEY)
    sessionStorage.removeItem(SELECTED_ACCOUNT_KEY)
    sessionStorage.removeItem(ACCOUNT_TYPE_KEY)

    clearOAuthState()
  }, [ws])

  const ensureValidToken = useCallback(
    async (
      acct: DerivSessionAccount,
    ): Promise<DerivSessionAccount> => {
      if (!isTokenExpired(acct.token_expiry)) {
        return acct
      }

      if (!acct.refresh_token) {
        throw new Error(SESSION_EXPIRED_MESSAGE)
      }

      const tokens = await refreshAccessToken(
        acct.refresh_token,
      )

      if (!tokens.access_token) {
        throw new Error(SESSION_EXPIRED_MESSAGE)
      }

      const updated: DerivSessionAccount = {
        ...acct,
        access_token: tokens.access_token,
        token_expiry:
          Date.now() +
          (tokens.expires_in || 3600) * 1000,
        refresh_token:
          tokens.refresh_token || acct.refresh_token,
      }

      setAccounts((prev) => {
        const next = prev.map((candidate) =>
          candidate.account_id === updated.account_id
            ? updated
            : candidate,
        )

        saveAccounts(next)

        return next
      })

      return updated
    },
    [],
  )

  const switchAccount = useCallback(
    async (accountId: string) => {
      const nextAccount = accounts.find(
        (candidate) =>
          candidate.account_id === accountId,
      )

      if (!nextAccount) {
        throw new Error('Account not found.')
      }

      setIsLoading(true)
      setError(null)

      try {
        const refreshed =
          await ensureValidToken(nextAccount)

        const otpUrl = await fetchOtpUrl(
          refreshed.access_token,
          refreshed.account_id,
        )

        const nextWs =
          await connectViaOtp(otpUrl)

        const updatedAccount: DerivSessionAccount = {
          ...refreshed,
          ws_url: otpUrl,
        }

        ws?.disconnect()

        const nextAccounts = accounts.map(
          (candidate) =>
            candidate.account_id ===
            updatedAccount.account_id
              ? updatedAccount
              : candidate,
        )

        saveAccounts(nextAccounts)

        sessionStorage.setItem(
          SELECTED_ACCOUNT_KEY,
          updatedAccount.account_id,
        )

        setAccounts(nextAccounts)
        setSelectedAccountId(
          updatedAccount.account_id,
        )
        setAccountType(
          updatedAccount.account_type === 'real'
            ? 'real'
            : 'demo',
        )
        setWs(nextWs)
      } catch (switchError) {
        const message =
          switchError instanceof Error
            ? switchError.message
            : 'Unable to switch Deriv accounts.'

        setError(message)

        throw new Error(message)
      } finally {
        setIsLoading(false)
      }
    },
    [accounts, ws, ensureValidToken],
  )

  const handleCallback = useCallback(
    async (params: URLSearchParams) => {
      setIsLoading(true)
      setError(null)

      try {
        const callbackError =
          params.get('error_description') ||
          params.get('error')

        if (callbackError) {
          throw new Error(callbackError)
        }

        const code = params.get('code')
        const returnedState = params.get('state')
        const storedState = getStoredOAuthState()
        const codeVerifier = getStoredCodeVerifier()

        if (
          !code ||
          !returnedState ||
          !storedState ||
          returnedState !== storedState
        ) {
          throw new Error(
            'The Deriv sign-in session could not be verified. Please try again.',
          )
        }

        if (!codeVerifier) {
          throw new Error(
            'The Deriv sign-in session has expired. Please try again.',
          )
        }

        const tokens = await callDerivOAuth({
          code,
          code_verifier: codeVerifier,
          client_id: DERIV_CLIENT_ID,
          redirect_uri: DERIV_REDIRECT_URI,
        })

        if (!tokens.access_token) {
          throw new Error(
            'Deriv did not return an access token.',
          )
        }

        /*
         * Do not create a demo account here.
         * Deriv provides the user's demo account.
         */
        const accountList = await fetchAccounts(
          tokens.access_token,
        )

        if (accountList.length === 0) {
          throw new Error(
            'Deriv returned no trading accounts for this user.',
          )
        }

        const sessionAccounts =
          accountList.map((acct) =>
            toSessionAccount(acct, tokens),
          )

        const demoAccount =
          sessionAccounts.find(
            (candidate) =>
              candidate.account_type === 'demo',
          )

        const firstAccount =
          demoAccount || sessionAccounts[0]

        if (!firstAccount) {
          throw new Error(
            'No usable Deriv account was returned.',
          )
        }

        const otpUrl = await fetchOtpUrl(
          tokens.access_token,
          firstAccount.account_id,
        )

        const nextWs =
          await connectViaOtp(otpUrl)

        const connectedFirstAccount: DerivSessionAccount = {
          ...firstAccount,
          ws_url: otpUrl,
        }

        const connectedAccounts =
          sessionAccounts.map((candidate) =>
            candidate.account_id ===
            connectedFirstAccount.account_id
              ? connectedFirstAccount
              : candidate,
          )

        ws?.disconnect()

        saveAccounts(connectedAccounts)

        sessionStorage.setItem(
          SELECTED_ACCOUNT_KEY,
          connectedFirstAccount.account_id,
        )

        sessionStorage.setItem(
          ACCOUNT_TYPE_KEY,
          connectedFirstAccount.account_type ===
            'real'
            ? 'real'
            : 'demo',
        )

        clearOAuthState()

        setAccounts(connectedAccounts)
        setSelectedAccountId(
          connectedFirstAccount.account_id,
        )
        setAccountType(
          connectedFirstAccount.account_type ===
            'real'
            ? 'real'
            : 'demo',
        )
        setWs(nextWs)
      } catch (callbackError) {
        const message =
          callbackError instanceof Error
            ? callbackError.message
            : 'Unable to complete Deriv sign-in.'

        setError(message)

        clearOAuthState()

        throw new Error(message)
      } finally {
        setIsLoading(false)
      }
    },
    [ws],
  )

  const selectAccount = useCallback(
    async (accountId: string) => {
      await switchAccount(accountId)
    },
    [switchAccount],
  )

  const switchAccountType = useCallback(
    async (type: AccountType) => {
      const targetAccount = accounts.find(
        (candidate) =>
          candidate.account_type === type,
      )

      if (!targetAccount) {
        const message =
          type === 'real'
            ? 'No real account found. Enable real trading first.'
            : 'No demo account found.'

        setError(message)

        throw new Error(message)
      }

      setAccountType(type)

      sessionStorage.setItem(
        ACCOUNT_TYPE_KEY,
        type,
      )

      if (
        targetAccount.account_id ===
        account?.account_id
      ) {
        return
      }

      await switchAccount(
        targetAccount.account_id,
      )
    },
    [accounts, account?.account_id, switchAccount],
  )

  const enableRealTrading = useCallback(
    async () => {
      if (!account) {
        throw new Error(
          'You must be signed in before enabling real trading.',
        )
      }

      setIsLoading(true)
      setError(null)

      try {
        const validated =
          await ensureValidToken(account)

        let accountList = await fetchAccounts(
          validated.access_token,
        )

        const existingRealAccount =
          accountList.find(
            (candidate) =>
              candidate.account_type === 'real',
          )

        if (!existingRealAccount) {
          const realAcct = await createAccount(
            validated.access_token,
            'real',
          )

          accountList = [
            ...accountList,
            realAcct,
          ]
        }

        const tokens: OAuthTokenResponse = {
          access_token:
            validated.access_token,
          expires_in: Math.max(
            1,
            Math.floor(
              (validated.token_expiry -
                Date.now()) /
                1000,
            ),
          ),
          refresh_token:
            validated.refresh_token,
        }

        const existingIds = new Set(
          accounts.map(
            (candidate) =>
              candidate.account_id,
          ),
        )

        const newSessionAccounts =
          accountList
            .filter(
              (candidate) =>
                !existingIds.has(
                  candidate.account_id,
                ),
            )
            .map((candidate) =>
              toSessionAccount(
                candidate,
                tokens,
              ),
            )

        if (newSessionAccounts.length > 0) {
          setAccounts((prev) => {
            const next = [
              ...prev,
              ...newSessionAccounts,
            ]

            saveAccounts(next)

            return next
          })
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to enable real trading.'

        setError(message)

        throw new Error(message)
      } finally {
        setIsLoading(false)
      }
    },
    [account, accounts, ensureValidToken],
  )

  const refreshBalance = useCallback(
    async () => {
      if (!ws || !account) {
        return
      }

      try {
        const res = await ws.send({
          balance: 1,
        })

        if (
          res.balance?.balance !==
          undefined
        ) {
          const newBalance = parseFloat(
            res.balance.balance,
          )

          const currency =
            res.balance.currency ||
            account.currency

          setAccounts((prev) => {
            const next = prev.map(
              (candidate) =>
                candidate.account_id ===
                account.account_id
                  ? {
                      ...candidate,
                      balance:
                        newBalance,
                      currency,
                    }
                  : candidate,
            )

            saveAccounts(next)

            return next
          })
        }
      } catch {
        // Ignore balance refresh errors.
      }
    },
    [ws, account],
  )

  useEffect(() => {
    if (!account || ws) {
      return
    }

    let cancelled = false

    const restoreConnection = async () => {
      try {
        const validated =
          await ensureValidToken(account)

        if (cancelled) {
          return
        }

        const otpUrl = await fetchOtpUrl(
          validated.access_token,
          validated.account_id,
        )

        if (cancelled) {
          return
        }

        const nextWs =
          await connectViaOtp(otpUrl)

        if (cancelled) {
          nextWs.disconnect()
          return
        }

        const updatedAccount: DerivSessionAccount = {
          ...validated,
          ws_url: otpUrl,
        }

        setAccounts((prev) => {
          const next = prev.map(
            (candidate) =>
              candidate.account_id ===
              updatedAccount.account_id
                ? updatedAccount
                : candidate,
          )

          saveAccounts(next)

          return next
        })

        setWs(nextWs)
      } catch (restoreError) {
        if (cancelled) {
          return
        }

        const message =
          restoreError instanceof Error
            ? restoreError.message
            : SESSION_EXPIRED_MESSAGE

        /*
         * Do not destroy a valid stored session because of
         * a temporary API outage such as a 503.
         */
        if (
          message === SESSION_EXPIRED_MESSAGE
        ) {
          sessionStorage.removeItem(
            ACCOUNTS_KEY,
          )

          sessionStorage.removeItem(
            SELECTED_ACCOUNT_KEY,
          )

          sessionStorage.removeItem(
            ACCOUNT_TYPE_KEY,
          )

          setAccounts([])
          setSelectedAccountId(null)
        }

        setError(message)
      }
    }

    void restoreConnection()

    return () => {
      cancelled = true
    }
  }, [account, ws, ensureValidToken])

  return (
    <AuthContext.Provider
      value={{
        accounts,
        account,
        accountType,
        ws,
        isAuthenticated:
          accounts.length > 0,
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
        refreshBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider',
    )
  }

  return context
}

