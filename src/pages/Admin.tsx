import { useAuth } from '../context/AuthContext'
import { Settings, ExternalLink, Info } from 'lucide-react'

const DERIV_DEV_DASHBOARD_URL = 'https://api.deriv.com/dashboard/settings'

export default function Admin() {
  const { isAuthenticated, account } = useAuth()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Admin Settingss</h1>
        <p className="text-text-secondary">Configure your app's markup commission rate.</p>
      </div>

      {isAuthenticated && account && (
        <div className="rounded-xl bg-bg-secondary border border-border-default p-5 mb-6">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Connected Account</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{account.account_id} {account.account_type === 'demo' && '(Demo)'}</p>
              <p className="text-sm text-text-muted">{account.currency} {account.balance.toFixed(2)}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-brand-red/15 text-brand-red text-xs font-medium">
              Connected
            </span>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-bg-secondary border border-border-default p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-brand-red" />
          <h2 className="font-semibold">Markup Configuration</h2>
        </div>

        <div className="flex items-start gap-3 bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3 text-sm text-brand-red mb-5">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Markup is now managed directly in the Deriv developer dashboard. Use the link below to open your app settings and adjust the markup percentage there.
          </span>
        </div>

        <a
          href={DERIV_DEV_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-red text-white font-semibold hover:bg-brand-red-dim transition-colors"
        >
          Open Deriv Developer Dashboard
          <ExternalLink className="w-4 h-4" />
        </a>

        <div className="mt-6 pt-5 border-t border-border-default text-xs text-text-muted space-y-1">
          <p>In the dashboard, navigate to your app's settings page to change the markup percentage (max 3%).</p>
          <p>Changes take effect immediately for all trades placed through this platform.</p>
        </div>
      </div>
    </div>
  )
}
