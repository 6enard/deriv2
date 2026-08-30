
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Shield,
  Zap,
  DollarSign,
  Loader as Loader2,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Globe2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useDerivAuth } from '../hooks/useDerivAuth'

function StartTradingButton() {
  const { login, isLoading } = useDerivAuth()

  return (
    <button
      type="button"
      onClick={() => {
        void login()
      }}
      disabled={isLoading}
      className="
        group relative inline-flex items-center justify-center gap-3
        px-7 py-4 sm:px-8 sm:py-4
        rounded-2xl
        bg-brand-red text-white
        font-semibold text-base sm:text-lg
        shadow-[0_12px_40px_rgba(255,45,85,0.22)]
        hover:shadow-[0_16px_50px_rgba(255,45,85,0.35)]
        hover:-translate-y-0.5
        active:translate-y-0
        transition-all duration-300
        disabled:opacity-60 disabled:cursor-not-allowed
        overflow-hidden
      "
    >
      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

      <span className="relative">
        {isLoading ? 'Connecting...' : 'Start Trading'}
      </span>

      <ArrowRight
        className="relative w-5 h-5 group-hover:translate-x-1 transition-transform"
      />
    </button>
  )
}

export default function Home() {
  const { isAuthenticated, isLoading, error } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-300px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand-red/10 blur-[140px]" />
        <div className="absolute right-[-200px] top-[25%] h-[400px] w-[400px] rounded-full bg-brand-red/5 blur-[120px]" />
        <div className="absolute left-[-200px] bottom-[10%] h-[350px] w-[350px] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <main className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-16 sm:py-24 lg:py-28">

        {/* HERO */}
        <section className="text-center max-w-5xl mx-auto">

          {/* Powered by badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.035] border border-white/[0.08] backdrop-blur-xl text-sm text-text-secondary shadow-lg mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-red" />
            </span>

            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLEbCdx6A1ZzWJ01xPFb93vDvuzLrTw1KKqQu0fMZrtbd0RK8MkJNe6qw&s=10"
              alt="Deriv"
              className="w-5 h-5 rounded-full object-cover"
            />

            <span>
              Powered by <span className="text-text-primary font-medium">Deriv</span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[80px] font-bold tracking-[-0.045em] leading-[0.98] mb-7">
            <span className="block text-text-primary">
              Your Markets.
            </span>

            <span className="block bg-gradient-to-r from-brand-red via-brand-red to-red-400 bg-clip-text text-transparent">
              Your Moment.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-text-secondary leading-relaxed mb-10">
            Trade global markets with a powerful, modern platform built
            around speed, flexibility, and real-time access to Deriv.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-5">
            {isLoading ? (
              <div className="flex items-center gap-3 text-text-secondary py-4">
                <Loader2 className="w-5 h-5 animate-spin text-brand-red" />
                <span>Connecting to Deriv...</span>
              </div>
            ) : error ? (
              <div className="w-full max-w-md space-y-4">
                <div className="rounded-2xl bg-brand-red/10 border border-brand-red/20 px-5 py-4 text-sm text-brand-red backdrop-blur-xl">
                  {error}
                </div>

                <StartTradingButton />
              </div>
            ) : (
              <StartTradingButton />
            )}

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm text-text-secondary">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-red" />
                Secure authentication
              </div>

              <div className="hidden sm:block w-1 h-1 rounded-full bg-text-secondary/40" />

              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-red" />
                Real-time markets
              </div>

              <div className="hidden sm:block w-1 h-1 rounded-full bg-text-secondary/40" />

              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-red" />
                Built for traders
              </div>
            </div>
          </div>
        </section>

        {/* MARKET PREVIEW */}
        <section className="relative mt-20 sm:mt-24 max-w-5xl mx-auto">
          <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl p-2 shadow-2xl">

            {/* Glow */}
            <div className="absolute inset-x-20 -bottom-10 h-24 bg-brand-red/10 blur-3xl" />

            <div className="relative rounded-[22px] border border-white/[0.06] bg-bg-secondary/80 overflow-hidden">

              {/* Fake terminal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                  </div>

                  <div className="h-4 w-px bg-white/10" />

                  <span className="text-xs text-text-secondary">
                    Trading Terminal
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Markets Open
                </div>
              </div>

              {/* Chart area */}
              <div className="relative h-64 sm:h-80 p-5">

                {/* Chart grid */}
                <div
                  className="absolute inset-0 opacity-[0.035]"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px',
                  }}
                />

                {/* Fake chart */}
                <svg
                  className="absolute inset-x-5 top-10 bottom-8 w-[calc(100%-40px)] h-[calc(100%-72px)]"
                  viewBox="0 0 1000 300"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <path
                    d="M0 240 L60 225 L110 235 L160 190 L210 205 L260 170 L310 185 L360 130 L410 150 L460 115 L510 140 L560 100 L610 120 L660 80 L710 105 L760 65 L810 90 L860 50 L920 70 L1000 35 L1000 300 L0 300 Z"
                    fill="url(#chartFill)"
                    className="text-brand-red"
                  />

                  <path
                    d="M0 240 L60 225 L110 235 L160 190 L210 205 L260 170 L310 185 L360 130 L410 150 L460 115 L510 140 L560 100 L610 120 L660 80 L710 105 L760 65 L810 90 L860 50 L920 70 L1000 35"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    className="text-brand-red"
                  />
                </svg>

                {/* Chart labels */}
                <div className="absolute top-5 left-5">
                  <div className="text-xs text-text-secondary mb-1">
                    Synthetic Index
                  </div>
                  <div className="text-xl font-semibold text-text-primary">
                    R_100
                  </div>
                </div>

                <div className="absolute top-5 right-5 text-right">
                  <div className="text-xl font-semibold text-text-primary">
                    1,842.36
                  </div>
                  <div className="text-xs text-green-400">
                    +2.41%
                  </div>
                </div>

                <div className="absolute bottom-4 left-5 flex items-center gap-4 text-[10px] text-text-secondary">
                  <span>1H</span>
                  <span className="text-brand-red font-medium">4H</span>
                  <span>1D</span>
                  <span>1W</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="mt-24 sm:mt-32">

          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-brand-red font-semibold mb-3">
              <Sparkles className="w-4 h-4" />
              Built for modern trading
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Everything you need to trade
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <FeatureCard
              icon={Shield}
              title="Secure Deriv Login"
              description="Your credentials stay with Deriv. Authentication happens through Deriv's official authorization flow."
            />

            <FeatureCard
              icon={Zap}
              title="Real-Time Trading"
              description="Access live markets and execute trades through your connected Deriv account."
            />

            <FeatureCard
              icon={DollarSign}
              title="Transparent Pricing"
              description="A clearly configured 3% markup is applied to trades executed through the platform."
            />

          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="relative mt-16 sm:mt-20 rounded-3xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl overflow-hidden">

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-brand-red/10 blur-3xl" />

          <div className="relative p-6 sm:p-10 lg:p-12">

            <div className="max-w-xl mb-10">
              <div className="text-xs uppercase tracking-[0.2em] text-brand-red font-semibold mb-3">
                Simple by design
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Start trading in minutes
              </h2>

              <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                Connect your Deriv account, approve access, and you're ready
                to explore the markets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

              <Step
                number="01"
                icon={Shield}
                title="Sign in"
                description="Connect securely through Deriv's official authorization page."
              />

              <Step
                number="02"
                icon={CheckCircle2}
                title="Approve"
                description="Review the requested permissions and approve access."
              />

              <Step
                number="03"
                icon={BarChart3}
                title="Trade"
                description="Explore markets and place trades through the platform."
              />

              <Step
                number="04"
                icon={Globe2}
                title="Go anywhere"
                description="Access your trading experience wherever you are."
              />

            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="text-center mt-20 sm:mt-28 pb-8">

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-red/10 border border-brand-red/20 mb-5">
            <Zap className="w-5 h-5 text-brand-red" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Ready to trade?
          </h2>

          <p className="text-text-secondary max-w-lg mx-auto mb-7">
            Connect your Deriv account and start exploring the markets.
          </p>

          <StartTradingButton />
        </section>

      </main>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div
      className="
        group relative rounded-2xl
        bg-white/[0.025]
        border border-white/[0.07]
        p-6 sm:p-7
        hover:bg-white/[0.045]
        hover:border-brand-red/20
        hover:-translate-y-1
        transition-all duration-300
      "
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-red/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative">

        <div className="w-11 h-11 rounded-xl bg-brand-red/10 border border-brand-red/15 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
          <Icon className="w-5 h-5 text-brand-red" />
        </div>

        <h3 className="font-semibold text-base mb-2">
          {title}
        </h3>

        <p className="text-sm text-text-secondary leading-relaxed">
          {description}
        </p>

      </div>
    </div>
  )
}

function Step({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="relative">

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-red/10 border border-brand-red/20">
          <Icon className="w-4 h-4 text-brand-red" />
        </div>

        <span className="text-xs font-mono text-text-secondary/60">
          {number}
        </span>
      </div>

      <h3 className="font-semibold text-sm mb-2">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
        {description}
      </p>

    </div>
  )
}

