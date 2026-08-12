import { useMemo } from 'react'
import { ExternalLink, Loader as Loader2, ShieldCheck } from 'lucide-react'
import { useDerivAuth } from '../hooks/useDerivAuth'
import { DERIV_APP_ID } from '../lib/config'

export default function TradingPage() {
  const { accounts, account, selectAccount, isLoading, error } = useDerivAuth()

  const tradingUrl = useMemo(() => {
    if (!account) return ''
    const params = new URLSearchParams({
      app_id: DERIV_APP_ID,
      l: 'EN',
      brand: 'deriv',
      acct1: account.loginid,
      token1: account.token,
      cur1: account.currency,
      markup_percentage: '3',
    })
    return `https://app.deriv.com/trading?${params.toString()}`
  }, [account])

  if (!account || !tradingUrl) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Preparing trading platform...
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-9rem)] min-h-[680px] flex flex-col">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-bg-secondary border border-border-default px-4 py-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-green" />
            <div>
              <p className="text-sm font-semibold">Deriv Trading Platform</p>
              <p className="text-xs text-text-muted">3% markup applied to contracts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {accounts.length > 1 && (
              <select
                value={account.loginid}
                onChange={(event) => { void selectAccount(event.target.value) }}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue"
              >
                {accounts.map((candidate) => (
                  <option key={candidate.loginid} value={candidate.loginid}>
                    {candidate.loginid} · {candidate.currency}
                  </option>
                ))}
              </select>
            )}
            <a
              href={tradingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              Open separately
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
      </div>
      <iframe
        title="Deriv Trading Platform"
        src={tradingUrl}
        className="flex-1 w-full border-0 bg-white"
        allow="clipboard-read; clipboard-write; fullscreen"
      />
    </div>
  )
}
