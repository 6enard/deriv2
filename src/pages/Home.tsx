import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, Zap, DollarSign, ArrowRight, Loader2 } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, login, handleCallback, isLoading, error } = useAuth()
  const navigate = useNavigate()
  const [callbackError, setCallbackError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/trade')
      return
    }

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (code && state) {
      handleCallback(code, state).then(() => {
        window.history.replaceState({}, document.title, window.location.pathname)
      })
      .catch((err) => {
        setCallbackError(err.message)
        window.history.replaceState({}, document.title, window.location.pathname)
      })
    }
  }, [isAuthenticated, handleCallback, navigate])

  const displayError = error || callbackError

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-tertiary border border-border-light text-xs font-medium text-text-secondary mb-6">
          <span className="w-2 h-2 rounded-full bg-brand-green pulse-glow" />
          Powered by Deriv API
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-tight">
          Trade the markets with
          <span className="block text-brand-green">3% markup revenue</span>
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
          Connect your Deriv account and trade directly through our platform.
          Every contract you execute carries a 3% markup that generates revenue.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-text-secondary">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Connecting to Deriv...</span>
          </div>
        ) : displayError ? (
          <div className="max-w-md mx-auto">
            <div className="bg-brand-red/10 border border-brand-red/30 rounded-lg px-4 py-3 mb-4 text-sm text-brand-red">
              {displayError}
            </div>
            <button
              onClick={login}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-green text-bg-primary font-semibold hover:bg-brand-green-dim transition-colors"
            >
              Try Again
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-bg-primary font-semibold text-lg hover:bg-brand-green-dim transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Connect Deriv Account
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-12">
        <FeatureCard
          icon={Shield}
          title="Secure OAuth Login"
          description="Your Deriv credentials stay with Deriv. We use OAuth 2.0 with PKCE — we never see your password."
        />
        <FeatureCard
          icon={Zap}
          title="Real-Time Trading"
          description="Live price feeds via WebSocket. Execute trades in milliseconds with up/down contracts."
        />
        <FeatureCard
          icon={DollarSign}
          title="3% Markup Revenue"
          description="Every trade through our platform carries a 3% markup on the contract payout, generating revenue automatically."
        />
      </div>

      <div className="mt-16 rounded-2xl bg-bg-secondary border border-border-default p-6 sm:p-8">
        <h2 className="text-xl font-semibold mb-4">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Step number="1" title="Connect" description="Click Connect Deriv Account and log in on Deriv's secure page." />
          <Step number="2" title="Choose a market" description="Select from volatility indices, forex, and commodities." />
          <Step number="3" title="Trade" description="Pick up or down, set your stake and duration, and execute." />
          <Step number="4" title="Earn" description="Deriv executes the trade. Your 3% markup applies automatically." />
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-xl bg-bg-secondary border border-border-default p-6 hover:border-border-light transition-colors">
      <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-brand-green" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-brand-green/15 border border-brand-green/30 flex items-center justify-center text-sm font-bold text-brand-green shrink-0">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
