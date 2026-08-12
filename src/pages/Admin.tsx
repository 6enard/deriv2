import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { DerivWS } from '../lib/deriv-ws'
import { Settings, Loader2, CheckCircle, AlertCircle, Key } from 'lucide-react'

const APP_ID = import.meta.env.VITE_DERIV_APP_ID

export default function Admin() {
  const { isAuthenticated, account } = useAuth()
  const [pat, setPat] = useState('')
  const [markup, setMarkup] = useState('3')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const setMarkupViaWs = async () => {
    setStatus('loading')
    setMessage('')
    try {
      const ws = new DerivWS(APP_ID)
      await ws.connect()

      const authRes = await ws.send({ authorize: pat })
      if (authRes.error) throw new Error(authRes.error.message)

      const updateRes = await ws.send({
        app_update: APP_ID,
        app_markup_percentage: parseFloat(markup),
      })

      if (updateRes.error) throw new Error(updateRes.error.message)

      setStatus('success')
      setMessage(`Markup set to ${markup}% successfully. Your app now earns ${markup}% on every trade.`)
      ws.disconnect()
      setPat('')
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Failed to set markup. Make sure your PAT has admin scope.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Admin Settings</h1>
        <p className="text-text-secondary">Configure your app's markup commission rate.</p>
      </div>

      {isAuthenticated && account && (
        <div className="rounded-xl bg-bg-secondary border border-border-default p-5 mb-6">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Connected Account</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{account.loginid} {account.is_virtual && '(Demo)'}</p>
              <p className="text-sm text-text-muted">{account.currency} {account.balance.toFixed(2)}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-brand-green/15 text-brand-green text-xs font-medium">
              Connected
            </span>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-bg-secondary border border-border-default p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-brand-blue" />
          <h2 className="font-semibold">Markup Configuration</h2>
        </div>

        <p className="text-sm text-text-secondary mb-5">
          Set the markup percentage that your app earns on every trade. Deriv allows a maximum of 3%.
          This requires a Personal Access Token (PAT) with admin scope from your Deriv account settings.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Personal Access Token (Admin Scope)
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="password"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="Enter your Deriv PAT with admin scope"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Markup Percentage (max 3%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                min="0"
                max="3"
                step="0.1"
                className="w-24 px-3 py-2.5 rounded-lg bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors tabular"
              />
              <span className="text-text-secondary text-sm">%</span>
            </div>
          </div>

          <button
            onClick={setMarkupViaWs}
            disabled={!pat || status === 'loading'}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-brand-green text-bg-primary font-semibold hover:bg-brand-green-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting markup...
              </>
            ) : (
              'Set Markup'
            )}
          </button>

          {status === 'success' && (
            <div className="flex items-start gap-2 bg-brand-green/10 border border-brand-green/30 rounded-lg px-4 py-3 text-sm text-brand-green slide-in">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-2 bg-brand-red/10 border border-brand-red/30 rounded-lg px-4 py-3 text-sm text-brand-red slide-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-border-default text-xs text-text-muted space-y-1">
          <p>To get a PAT: Log in to your Deriv account → Settings → API Token → Create token with Admin scope.</p>
          <p>Your PAT is used only for this one-time setup and is never stored.</p>
        </div>
      </div>
    </div>
  )
}
