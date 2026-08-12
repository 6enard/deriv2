import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ConnectButton from '../components/ConnectButton'
import { Shield, Zap, DollarSign, Loader as Loader2, type LucideIcon } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, isLoading, error } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/trade', { replace: true })
  }, [isAuthenticated, navigate])

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
        ) : error ? (
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-brand-red/10 border border-brand-red/30 rounded-lg px-4 py-3 text-sm text-brand-red">
              {error}
            </div>
            <ConnectButton />
          </div>
        ) : (
          <ConnectButton />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-12">
        <FeatureCard icon={Shield} title="Secure Deriv Login" description="Your Deriv credentials stay with Deriv. Approve access on Deriv's official sign-in page." />
        <FeatureCard icon={Zap} title="Real-Time Trading" description="Place trades on live Deriv markets through this platform using your connected account." />
        <FeatureCard icon={DollarSign} title="3% Markup Revenue" description="Every trade through our platform carries the configured 3% markup." />
      </div>

      <div className="mt-16 rounded-2xl bg-bg-secondary border border-border-default p-6 sm:p-8">
        <h2 className="text-xl font-semibold mb-4">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Step number="1" title="Sign in" description="Sign in on Deriv's official authorization page." />
          <Step number="2" title="Approve" description="Review and approve trading access on Deriv." />
          <Step number="3" title="Trade" description="Place trades through this platform using live Deriv markets." />
          <Step number="4" title="Earn" description="The configured 3% markup applies to eligible contracts." />
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
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
