
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
  DERIV_APP_ID,
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
  group?: string
  status?: string
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

class DerivApiError extends Error {
  status: number | null
  code: string | null

  constructor(
    message: string,
    status: number | null = null,
    code: string | null = null,
  ) {
    super(message)
    this.name = 'DerivApiError'
    this.status = status
    this.code = code
  }
}

const AuthContext = createContext<AuthContextType | null>(null)

const SESSION_EXPIRED_MESSAGE =
  'Your Deriv session has expired. Please sign in again.'

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

/*
 * Keep retries deliberately small.
 *
 * Deriv can return CircuitBreakerBusy while its backend
 * is performing a health probe. Repeatedly hitting the same
 * endpoint does not help and makes the browser console noisy.
 */
const MAX_API_RETRIES = 2
const INITIAL_RETRY_DELAY_MS = 1000
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

    return parsed.filter(
      (account): account is DerivSessionAccount => {
        if (!account || typeof account !== 'object') {
          return false
        }

        const candidate =
          account as Partial<DerivSessionAccount>

        return (
          typeof candidate.account_id === 'string' &&
          typeof candidate.access_token === 'string'
        )
      },
    )
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
    throw new Error(
      'Deriv returned an invalid token response.',
    )
  }

  return data as OAuthTokenResponse
}

function authHeaders(
  accessToken: string,
): Record<string, string> {
  return {
    'Deriv-App-ID': DERIV_APP_ID,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

function isTokenExpired(expiry: number): boolean {
  return Date.now() >= expiry - REFRESH_THRESHOLD_MS
}

function getDerivError(
  body: unknown,
  fallback: string,
  status: number | null = null,
): DerivApiError {
  if (!body || typeof body !== 'object') {
    return new DerivApiError(fallback, status)
  }

  const data = body as DerivErrorResponse

  if (
    Array.isArray(data.errors) &&
    data.errors.length > 0
  ) {
    const firstError = data.errors[0]

    if (firstError?.message) {
      return new DerivApiError(
        firstError.message,
        firstError.status ?? status,
        firstError.code ?? null,
      )
    }
  }

  if (
    typeof data.error === 'string' &&
    data.error.trim()
  ) {
    return new DerivApiError(
      data.error,
      status,
    )
  }

  if (
    typeof data.message === 'string' &&
    data.message.trim()
  ) {
    return new DerivApiError(
      data.message,
      status,
    )
  }

  return new DerivApiError(
    fallback,
    status,
  )
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
    const retryAfterSeconds =
      Number(retryAfterHeader)

    if (
      Number.isFinite(retryAfterSeconds) &&
      retryAfterSeconds >= 0
    ) {
      return Math.min(
        retryAfterSeconds * 1000,
        10_000,
      )
    }
  }

  const exponentialDelay =
    INITIAL_RETRY_DELAY_MS *
    Math.pow(2, attempt)

  const jitter =
    Math.floor(Math.random() * 300)

  return Math.min(
    exponentialDelay + jitter,
    5_000,
  )
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  requestName: string,
): Promise<Response> {
  let lastStatus: number | null = null

  for (
    let attempt = 0;
    attempt < MAX_API_RETRIES;
    attempt += 1
  ) {
    const controller =
      new AbortController()

    const timeout =
      window.setTimeout(() => {
        controller.abort()
      }, REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(
        url,
        {
          ...options,
          signal: controller.signal,
        },
      )

      lastStatus = response.status

      if (response.ok) {
        return response
      }

      /*
       * Authentication/validation errors should never
       * be retried.
       */
      if (
        !isRetryableStatus(response.status)
      ) {
        return response
      }

      /*
       * CircuitBreakerBusy is a temporary service state.
       * Give it only one retry.
       */
      if (
        attempt <
        MAX_API_RETRIES - 1
      ) {
        const delay =
          getRetryDelay(
            attempt,
            response.headers.get(
              'Retry-After',
            ),
          )

        await new Promise(
          (resolve) => {
            window.setTimeout(
              resolve,
              delay,
            )
          },
        )
      }
    } catch (error) {
      if (
        attempt >=
        MAX_API_RETRIES - 1
      ) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          throw new DerivApiError(
            `${requestName} timed out. Please check your connection and try again.`,
          )
        }

        if (
          error instanceof Error
        ) {
          throw error
        }

        throw new DerivApiError(
          `${requestName} failed.`,
        )
      }

      const delay =
        getRetryDelay(
          attempt,
          null,
        )

      await new Promise(
        (resolve) => {
          window.setTimeout(
            resolve,
            delay,
          )
        },
      )
    } finally {
      window.clearTimeout(
        timeout,
      )
    }
  }

  throw new DerivApiError(
    `${requestName} failed after ${MAX_API_RETRIES} attempts${
      lastStatus
        ? ` (${lastStatus})`
        : ''
    }. Please try again.`,
    lastStatus,
  )
}

async function callDerivOAuth(
  payload: Record<string, unknown>,
): Promise<OAuthTokenResponse> {
  const res =
    await fetchWithRetry(
      `${SUPABASE_URL}/functions/v1/deriv-oauth`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          Authorization:
            `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(
          payload,
        ),
      },
      'Deriv authentication request',
    )

  const body =
    await res
      .json()
      .catch(() => ({}))

  if (!res.ok) {
    throw getDerivError(
      body,
      `Authentication request failed (${res.status})`,
      res.status,
    )
  }

  return getOAuthToken(body)
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const tokens =
    await callDerivOAuth({
      grant_type:
        'refresh_token',
      refresh_token:
        refreshToken,
      client_id:
        DERIV_CLIENT_ID,
    })

  if (!tokens.access_token) {
    throw new DerivApiError(
      SESSION_EXPIRED_MESSAGE,
    )
  }

  return tokens
}

/*
 * GET /accounts
 *
 * This is still the preferred way to retrieve all accounts.
 */
async function fetchAccounts(
  accessToken: string,
): Promise<OptionsAccount[]> {
  const res =
    await fetchWithRetry(
      `${OPTIONS_API_BASE}/accounts`,
      {
        method: 'GET',
        headers:
          authHeaders(
            accessToken,
          ),
      },
      'Deriv accounts request',
    )

  const body =
    await res
      .json()
      .catch(() => ({}))

  if (!res.ok) {
    if (
      res.status === 401 ||
      res.status === 403
    ) {
      throw new DerivApiError(
        SESSION_EXPIRED_MESSAGE,
        res.status,
      )
    }

    throw getDerivError(
      body,
      `Accounts request failed (${res.status})`,
      res.status,
    )
  }

  if (
    !body ||
    typeof body !== 'object'
  ) {
    throw new DerivApiError(
      'Deriv returned an invalid accounts response.',
      res.status,
    )
  }

  const data =
    (body as {
      data?: unknown
    }).data

  if (!Array.isArray(data)) {
    throw new DerivApiError(
      'Deriv returned an invalid accounts list.',
      res.status,
    )
  }

  return data.filter(
    (
      account,
    ): account is OptionsAccount => {
      if (
        !account ||
        typeof account !== 'object'
      ) {
        return false
      }

      const candidate =
        account as Partial<OptionsAccount>

      return (
        typeof candidate.account_id ===
        'string'
      )
    },
  )
}

/*
 * POST /accounts
 *
 * Important:
 *
 * Deriv currently documents two successful response
 * formats:
 *
 * 200 -> data is a single account object because
 *        the account already exists.
 *
 * 201 -> data is an array because a new account
 *        was created.
 */
async function createAccount(
  accessToken: string,
  accountType: 'demo' | 'real',
): Promise<OptionsAccount> {
  const res =
    await fetchWithRetry(
      `${OPTIONS_API_BASE}/accounts`,
      {
        method: 'POST',
        headers:
          authHeaders(
            accessToken,
          ),
        body: JSON.stringify({
          currency: 'USD',
          group: 'row',
          account_type:
            accountType,
        }),
      },
      `Deriv ${accountType} account creation request`,
    )

  const body =
    await res
      .json()
      .catch(() => ({}))

  if (!res.ok) {
    if (
      res.status === 401 ||
      res.status === 403
    ) {
      throw new DerivApiError(
        SESSION_EXPIRED_MESSAGE,
        res.status,
      )
    }

    throw getDerivError(
      body,
      `Account creation failed (${res.status})`,
      res.status,
    )
  }

  if (
    !body ||
    typeof body !== 'object'
  ) {
    throw new DerivApiError(
      'Deriv returned an invalid account creation response.',
      res.status,
    )
  }

  const rawData =
    (body as {
      data?: unknown
    }).data

  let account:
    OptionsAccount | null =
    null

  /*
   * 200 response:
   * data = account object
   */
  if (
    rawData &&
    typeof rawData === 'object' &&
    !Array.isArray(rawData)
  ) {
    const candidate =
      rawData as OptionsAccount

    if (
      typeof candidate.account_id ===
      'string'
    ) {
      account = candidate
    }
  }

  /*
   * 201 response:
   * data = [account]
   */
  if (
    !account &&
    Array.isArray(rawData)
  ) {
    const candidate =
      rawData.find(
        (
          item,
        ): item is OptionsAccount =>
          !!item &&
          typeof item === 'object' &&
          typeof (
            item as Partial<OptionsAccount>
          ).account_id ===
            'string',
      )

    if (candidate) {
      account = candidate
    }
  }

  if (!account) {
    throw new DerivApiError(
      'Deriv did not return a usable account.',
      res.status,
    )
  }

  return account
}

/*
 * If GET /accounts is unavailable because of a temporary
 * Deriv circuit breaker, createAccount('demo') can still
 * return the user's existing demo account.
 *
 * Deriv documents HTTP 200 for an already-existing account
 * with the same parameters.
 */
async function getAccountsWithDemoFallback(
  accessToken: string,
): Promise<OptionsAccount[]> {
  try {
    const accounts =
      await fetchAccounts(
        accessToken,
      )

    if (accounts.length > 0) {
      return accounts
    }

    /*
     * GET succeeded but returned nothing.
     * Ask Deriv for the default demo account.
     */
    const demoAccount =
      await createAccount(
        accessToken,
        'demo',
      )

    return [demoAccount]
  } catch (error) {
    /*
     * Only use the account-creation fallback for
     * temporary service failures.
     *
     * Do not hide authentication/permission errors.
     */
    if (
      error instanceof DerivApiError &&
      (
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504
      )
    ) {
      const demoAccount =
        await createAccount(
          accessToken,
          'demo',
        )

      return [demoAccount]
    }

    throw error
  }
}

async function fetchOtpUrl(
  accessToken: string,
  accountId: string,
): Promise<string> {
  const res =
    await fetchWithRetry(
      `${OPTIONS_API_BASE}/accounts/${encodeURIComponent(accountId)}/otp`,
      {
        method: 'POST',
        headers:
          authHeaders(
            accessToken,
          ),
      },
      'Deriv connection request',
    )

  const body =
    await res
      .json()
      .catch(() => ({}))

  if (!res.ok) {
    if (
      res.status === 401 ||
      res.status === 403
    ) {
      throw new DerivApiError(
        SESSION_EXPIRED_MESSAGE,
        res.status,
      )
    }

    throw getDerivError(
      body,
      `OTP request failed (${res.status})`,
      res.status,
    )
  }

  if (
    !body ||
    typeof body !== 'object'
  ) {
    throw new DerivApiError(
      'Deriv returned an invalid connection response.',
      res.status,
    )
  }

  const data =
    (body as {
      data?: unknown
    }).data

  if (
    !data ||
    typeof data !== 'object'
  ) {
    throw new DerivApiError(
      'Deriv returned an invalid connection response.',
      res.status,
    )
  }

  const url =
    (data as {
      url?: unknown
    }).url

  if (
    typeof url !== 'string' ||
    !url
  ) {
    throw new DerivApiError(
      'Deriv did not return a connection URL.',
      res.status,
    )
  }

  return url
}

function toSessionAccount(
  acct: OptionsAccount,
  tokens: OAuthTokenResponse,
): DerivSessionAccount {
  return {
    account_id:
      acct.account_id,
    currency:
      acct.currency || 'USD',
    balance:
      Number(
        acct.balance || 0,
      ),
    account_type:
      acct.account_type ===
      'real'
        ? 'real'
        : 'demo',
    access_token:
      tokens.access_token!,
    token_expiry:
      Date.now() +
      (tokens.expires_in ||
        3600) *
        1000,
    refresh_token:
      tokens.refresh_token,
  }
}

async function connectViaOtp(
  url: string,
): Promise<DerivWS> {
  const ws =
    new DerivWS(url)

  await ws.connect()

  return ws
}

function saveAccounts(
  nextAccounts: DerivSessionAccount[],
): void {
  sessionStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify(
      nextAccounts,
    ),
  )
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [accounts, setAccounts] =
    useState<
      DerivSessionAccount[]
    >(readStoredAccounts)

  const [
    selectedAccountId,
    setSelectedAccountId,
  ] = useState<string | null>(
    () =>
      sessionStorage.getItem(
        SELECTED_ACCOUNT_KEY,
      ),
  )

  const [accountType, setAccountType] =
    useState<AccountType>(
      getStoredAccountType,
    )

  const [ws, setWs] =
    useState<DerivWS | null>(null)

  const [isLoading, setIsLoading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const account =
    accounts.find(
      (candidate) =>
        candidate.account_id ===
        selectedAccountId,
    ) ||
    accounts.find(
      (candidate) =>
        candidate.account_type ===
        accountType,
    ) ||
    accounts[0] ||
    null

  const isAdmin = account
    ? ADMIN_ACCOUNT_IDS.includes(
        account.account_id,
      )
    : false

  const login = useCallback(
    async () => {
      setError(null)

      try {
        const authUrl =
          await buildAuthUrl()

        window.location.assign(
          authUrl,
        )
      } catch (loginError) {
        const message =
          loginError instanceof Error
            ? loginError.message
            : 'Unable to start Deriv sign-in.'

        setError(message)

        throw new Error(
          message,
        )
      }
    },
    [],
  )

  const logout =
    useCallback(() => {
      ws?.disconnect()

      setWs(null)
      setAccounts([])
      setSelectedAccountId(null)
      setAccountType('demo')
      setError(null)

      sessionStorage.removeItem(
        ACCOUNTS_KEY,
      )

      sessionStorage.removeItem(
        SELECTED_ACCOUNT_KEY,
      )

      sessionStorage.removeItem(
        ACCOUNT_TYPE_KEY,
      )

      clearOAuthState()
    }, [ws])

  const ensureValidToken =
    useCallback(
      async (
        acct: DerivSessionAccount,
      ): Promise<DerivSessionAccount> => {
        if (
          !isTokenExpired(
            acct.token_expiry,
          )
        ) {
          return acct
        }

        if (!acct.refresh_token) {
          throw new DerivApiError(
            SESSION_EXPIRED_MESSAGE,
          )
        }

        const tokens =
          await refreshAccessToken(
            acct.refresh_token,
          )

        if (!tokens.access_token) {
          throw new DerivApiError(
            SESSION_EXPIRED_MESSAGE,
          )
        }

        const updated:
          DerivSessionAccount = {
          ...acct,
          access_token:
            tokens.access_token,
          token_expiry:
            Date.now() +
            (tokens.expires_in ||
              3600) *
              1000,
          refresh_token:
            tokens.refresh_token ||
            acct.refresh_token,
        }

        setAccounts(
          (prev) => {
            const next =
              prev.map(
                (candidate) =>
                  candidate.account_id ===
                  updated.account_id
                    ? updated
                    : candidate,
              )

            saveAccounts(
              next,
            )

            return next
          },
        )

        return updated
      },
      [],
    )

  const switchAccount =
    useCallback(
      async (
        accountId: string,
      ) => {
        const nextAccount =
          accounts.find(
            (candidate) =>
              candidate.account_id ===
              accountId,
          )

        if (!nextAccount) {
          throw new Error(
            'Account not found.',
          )
        }

        setIsLoading(true)
        setError(null)

        try {
          const refreshed =
            await ensureValidToken(
              nextAccount,
            )

          const otpUrl =
            await fetchOtpUrl(
              refreshed.access_token,
              refreshed.account_id,
            )

          const nextWs =
            await connectViaOtp(
              otpUrl,
            )

          const updatedAccount:
            DerivSessionAccount = {
            ...refreshed,
            ws_url: otpUrl,
          }

          ws?.disconnect()

          const nextAccounts =
            accounts.map(
              (candidate) =>
                candidate.account_id ===
                updatedAccount.account_id
                  ? updatedAccount
                  : candidate,
            )

          saveAccounts(
            nextAccounts,
          )

          sessionStorage.setItem(
            SELECTED_ACCOUNT_KEY,
            updatedAccount.account_id,
          )

          sessionStorage.setItem(
            ACCOUNT_TYPE_KEY,
            updatedAccount.account_type ===
              'real'
              ? 'real'
              : 'demo',
          )

          setAccounts(
            nextAccounts,
          )

          setSelectedAccountId(
            updatedAccount.account_id,
          )

          setAccountType(
            updatedAccount.account_type ===
              'real'
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

          throw new Error(
            message,
          )
        } finally {
          setIsLoading(false)
        }
      },
      [
        accounts,
        ws,
        ensureValidToken,
      ],
    )

  const handleCallback =
    useCallback(
      async (
        params: URLSearchParams,
      ) => {
        setIsLoading(true)
        setError(null)

        try {
          const callbackError =
            params.get(
              'error_description',
            ) ||
            params.get('error')

          if (callbackError) {
            throw new Error(
              callbackError,
            )
          }

          const code =
            params.get('code')

          const returnedState =
            params.get('state')

          const storedState =
            getStoredOAuthState()

          const codeVerifier =
            getStoredCodeVerifier()

          if (
            !code ||
            !returnedState ||
            !storedState ||
            returnedState !==
              storedState
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

          const tokens =
            await callDerivOAuth({
              code,
              code_verifier:
                codeVerifier,
              client_id:
                DERIV_CLIENT_ID,
              redirect_uri:
                DERIV_REDIRECT_URI,
            })

          if (!tokens.access_token) {
            throw new Error(
              'Deriv did not return an access token.',
            )
          }

          /*
           * First attempt the normal GET /accounts flow.
           *
           * If Deriv's account service is temporarily
           * unavailable with CircuitBreakerBusy, the
           * helper falls back to POST /accounts and gets
           * the existing/new demo account.
           */
          const accountList =
            await getAccountsWithDemoFallback(
              tokens.access_token,
            )

          if (
            accountList.length === 0
          ) {
            throw new Error(
              'Deriv returned no trading accounts for this user.',
            )
          }

          const sessionAccounts =
            accountList.map(
              (acct) =>
                toSessionAccount(
                  acct,
                  tokens,
                ),
            )

          const demoAccount =
            sessionAccounts.find(
              (candidate) =>
                candidate.account_type ===
                'demo',
            )

          const firstAccount =
            demoAccount ||
            sessionAccounts[0]

          if (!firstAccount) {
            throw new Error(
              'No usable Deriv account was returned.',
            )
          }

          /*
           * Request the one-time WebSocket URL
           * immediately before connecting.
           */
          const otpUrl =
            await fetchOtpUrl(
              tokens.access_token,
              firstAccount.account_id,
            )

          const nextWs =
            await connectViaOtp(
              otpUrl,
            )

          const connectedFirstAccount:
            DerivSessionAccount = {
            ...firstAccount,
            ws_url: otpUrl,
          }

          const connectedAccounts =
            sessionAccounts.map(
              (candidate) =>
                candidate.account_id ===
                connectedFirstAccount.account_id
                  ? connectedFirstAccount
                  : candidate,
            )

          ws?.disconnect()

          saveAccounts(
            connectedAccounts,
          )

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

          setAccounts(
            connectedAccounts,
          )

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

          throw new Error(
            message,
          )
        } finally {
          setIsLoading(false)
        }
      },
      [ws],
    )

  const selectAccount =
    useCallback(
      async (
        accountId: string,
      ) => {
        await switchAccount(
          accountId,
        )
      },
      [switchAccount],
    )

  const switchAccountType =
    useCallback(
      async (
        type: AccountType,
      ) => {
        const targetAccount =
          accounts.find(
            (candidate) =>
              candidate.account_type ===
              type,
          )

        if (!targetAccount) {
          const message =
            type === 'real'
              ? 'No real account found. Enable real trading first.'
              : 'No demo account found.'

          setError(message)

          throw new Error(
            message,
          )
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
      [
        accounts,
        account?.account_id,
        switchAccount,
      ],
    )

  const enableRealTrading =
    useCallback(
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
            await ensureValidToken(
              account,
            )

          let accountList:
            OptionsAccount[] = []

          /*
           * Try to retrieve existing accounts first.
           *
           * If GET /accounts is temporarily unavailable,
           * we still proceed to create/obtain the real
           * account directly.
           */
          try {
            accountList =
              await fetchAccounts(
                validated.access_token,
              )
          } catch (error) {
            if (
              error instanceof DerivApiError &&
              (
                error.status === 502 ||
                error.status === 503 ||
                error.status === 504
              )
            ) {
              accountList = []
            } else {
              throw error
            }
          }

          let existingRealAccount =
            accountList.find(
              (candidate) =>
                candidate.account_type ===
                'real',
            )

          if (
            !existingRealAccount
          ) {
            existingRealAccount =
              await createAccount(
                validated.access_token,
                'real',
              )

            accountList = [
              ...accountList,
              existingRealAccount,
            ]
          }

          const tokens:
            OAuthTokenResponse = {
            access_token:
              validated.access_token,
            expires_in:
              Math.max(
                1,
                Math.floor(
                  (
                    validated.token_expiry -
                    Date.now()
                  ) / 1000,
                ),
              ),
            refresh_token:
              validated.refresh_token,
          }

          const existingIds =
            new Set(
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
              .map(
                (candidate) =>
                  toSessionAccount(
                    candidate,
                    tokens,
                  ),
              )

          if (
            newSessionAccounts.length >
            0
          ) {
            setAccounts(
              (prev) => {
                const next = [
                  ...prev,
                  ...newSessionAccounts,
                ]

                saveAccounts(
                  next,
                )

                return next
              },
            )
          }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to enable real trading.'

          setError(message)

          throw new Error(
            message,
          )
        } finally {
          setIsLoading(false)
        }
      },
      [
        account,
        accounts,
        ensureValidToken,
      ],
    )

  const refreshBalance =
    useCallback(
      async () => {
        if (
          !ws ||
          !account
        ) {
          return
        }

        try {
          const res =
            await ws.send({
              balance: 1,
            })

          if (
            res.balance?.balance !==
            undefined
          ) {
            const newBalance =
              parseFloat(
                res.balance.balance,
              )

            const currency =
              res.balance.currency ||
              account.currency

            setAccounts(
              (prev) => {
                const next =
                  prev.map(
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

                saveAccounts(
                  next,
                )

                return next
              },
            )
          }
        } catch {
          /*
           * Balance refresh is non-critical.
           * Do not log users out because of a balance
           * refresh failure.
           */
        }
      },
      [ws, account],
    )

  /*
   * Restore the stored WebSocket session when the page
   * is refreshed.
   */
  useEffect(() => {
    if (
      !account ||
      ws
    ) {
      return
    }

    let cancelled = false

    const restoreConnection =
      async () => {
        try {
          const validated =
            await ensureValidToken(
              account,
            )

          if (cancelled) {
            return
          }

          const otpUrl =
            await fetchOtpUrl(
              validated.access_token,
              validated.account_id,
            )

          if (cancelled) {
            return
          }

          const nextWs =
            await connectViaOtp(
              otpUrl,
            )

          if (cancelled) {
            nextWs.disconnect()
            return
          }

          const updatedAccount:
            DerivSessionAccount = {
            ...validated,
            ws_url: otpUrl,
          }

          setAccounts(
            (prev) => {
              const next =
                prev.map(
                  (candidate) =>
                    candidate.account_id ===
                    updatedAccount.account_id
                      ? updatedAccount
                      : candidate,
                )

              saveAccounts(
                next,
              )

              return next
            },
          )

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
           * NEVER delete the stored session because of
           * a temporary Deriv 502/503/504.
           *
           * Only clear the session when Deriv explicitly
           * tells us the credentials are invalid/expired.
           */
          if (
            message ===
            SESSION_EXPIRED_MESSAGE
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
            setSelectedAccountId(
              null,
            )
          }

          setError(message)
        }
      }

    void restoreConnection()

    return () => {
      cancelled = true
    }
  }, [
    account,
    ws,
    ensureValidToken,
  ])

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
  const context =
    useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider',
    )
  }

  return context
}

