
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
      onClick={() => { void login() }}
      disabled={isLoading}
      className="
        group relative inline-flex items-center justify-center gap-3
        px-8 py-4 rounded-2xl
        bg-brand-red text-white
        font-semibold text-lg
        shadow-[0_12px_40px_rgba(255,45,85,0.18)]
        hover:shadow-[0_16px_50px_rgba(255,45,85,0.28)]
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

      <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
    </button>
  )
}

export default function Home() {
  const { isAuthenticated, isLoading, error } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  return (
    <div className="
      relative min-h-screen overflow-hidden
      bg-[#f7f8fa] text-[#111318]
      dark:bg-transparent dark:text-text-primary
    ">

      {/* =========================================================
          LIGHT MODE BACKGROUND
          ========================================================= */}

      <div className="pointer-events-none absolute inset-0 dark:hidden overflow-hidden">

        {/* Large architectural light */}
        <div className="
          absolute -top-72 left-1/2
          w-[900px] h-[600px]
          -translate-x-1/2
          rounded-full
          bg-red-500/[0.035]
          blur-[120px]
        " />

        <div className="
          absolute top-[35%] -right-64
          w-[600px] h-[600px]
          rounded-full
          bg-slate-300/30
          blur-[140px]
        " />

        {/* Fine technical grid */}
        <div
          className="absolute inset-0 opacity-[0.32]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)
            `,
            backgroundSize: '72px 72px',
          }}
        />
      </div>

      {/* =========================================================
          DARK MODE BACKGROUND — PRESERVED
          ========================================================= */}

      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute left-1/2 top-[-300px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand-red/10 blur-[140px]" />
        <div className="absolute right-[-200px] top-[25%] h-[400px] w-[400px] rounded-full bg-brand-red/5 blur-[120px]" />
        <div className="absolute left-[-200px] bottom-[10%] h-[350px] w-[350px] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      {/* =========================================================
          MAIN
          ========================================================= */}

      <main className="
        relative max-w-7xl mx-auto
        px-5 sm:px-8 lg:px-10
        py-16 sm:py-24 lg:py-28
      ">

        {/* =======================================================
            HERO
            ======================================================= */}

        <section className="relative text-center max-w-6xl mx-auto">

          {/* Status badge */}
          <div className="
            inline-flex items-center gap-2.5
            px-4 py-2
            rounded-full
            bg-white/80
            border border-slate-200
            shadow-[0_8px_30px_rgba(15,23,42,0.06)]
            backdrop-blur-xl
            text-xs sm:text-sm
            text-slate-600
            mb-8
            dark:bg-white/[0.035]
            dark:border-white/[0.08]
            dark:text-text-secondary
            dark:shadow-lg
          ">
            <span className="relative flex h-2 w-2">
              <span className="
                absolute inline-flex h-full w-full
                animate-ping rounded-full
                bg-brand-red opacity-40
              " />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-red" />
            </span>

            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLEbCdx6A1ZzWJ01xPFb93vDvuzLrTw1KKqQu0fMZrtbd0RK8MkJNe6qw&s=10"
              alt="Deriv"
              className="w-5 h-5 rounded-full object-cover"
            />

            <span>
              Powered by{' '}
              <span className="font-semibold text-slate-900 dark:text-text-primary">
                Deriv
              </span>
            </span>
          </div>

          {/* Editorial eyebrow */}
          <div className="
            flex items-center justify-center gap-3
            mb-5
            text-[10px] sm:text-xs
            font-semibold
            tracking-[0.28em]
            uppercase
            text-slate-400
            dark:text-text-secondary
          ">
            <span className="w-8 h-px bg-slate-300 dark:bg-white/10" />
            Next generation trading
            <span className="w-8 h-px bg-slate-300 dark:bg-white/10" />
          </div>

          {/* Hero headline */}
          <h1 className="
            text-5xl sm:text-6xl lg:text-7xl xl:text-[88px]
            font-bold
            tracking-[-0.055em]
            leading-[0.94]
            mb-7
          ">
            <span className="
              block
              text-slate-950
              dark:text-text-primary
            ">
              Trade without
            </span>

            <span className="
              block
              text-brand-red
            ">
              limits.
            </span>
          </h1>

          <p className="
            max-w-2xl mx-auto
            text-base sm:text-lg
            text-slate-500
            dark:text-text-secondary
            leading-relaxed
            mb-10
          ">
            A modern trading experience built for speed, precision,
            and direct access to global markets through Deriv.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-5">

            {isLoading ? (
              <div className="
                flex items-center gap-3
                text-slate-500
                dark:text-text-secondary
                py-4
              ">
                <Loader2 className="w-5 h-5 animate-spin text-brand-red" />
                <span>Connecting to Deriv...</span>
              </div>
            ) : error ? (
              <div className="max-w-md w-full space-y-4">

                <div className="
                  rounded-2xl
                  bg-red-50
                  border border-red-200
                  px-5 py-4
                  text-sm text-red-600
                  dark:bg-brand-red/10
                  dark:border-brand-red/20
                  dark:text-brand-red
                ">
                  {error}
                </div>

                <StartTradingButton />
              </div>
            ) : (
              <StartTradingButton />
            )}

            <div className="
              flex flex-wrap items-center justify-center
              gap-x-5 gap-y-2
              text-xs sm:text-sm
              text-slate-400
              dark:text-text-secondary
            ">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-red" />
                Secure authentication
              </div>

              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-text-secondary/40" />

              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-red" />
                Real-time markets
              </div>

              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-text-secondary/40" />

              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-red" />
                Built for traders
              </div>
            </div>
          </div>
        </section>

        {/* =======================================================
            PREMIUM MARKET VISUAL
            ======================================================= */}

        <section className="relative mt-20 sm:mt-24 max-w-6xl mx-auto">

          {/* Light mode outer frame */}
          <div className="
            relative
            rounded-[28px]
            border border-slate-200
            bg-white/75
            backdrop-blur-2xl
            p-2
            shadow-[0_30px_100px_rgba(15,23,42,0.10)]
            dark:border-white/[0.08]
            dark:bg-white/[0.025]
            dark:shadow-2xl
          ">

            {/* Light red glow */}
            <div className="
              absolute inset-x-24 -bottom-12
              h-28
              bg-brand-red/[0.07]
              blur-3xl
              dark:bg-brand-red/10
            " />

            <div className="
              relative
              rounded-[22px]
              overflow-hidden
              border border-slate-200/80
              bg-[#fafbfc]
              dark:border-white/[0.06]
              dark:bg-bg-secondary/80
            ">

              {/* Terminal header */}
              <div className="
                flex items-center justify-between
                px-5 py-4
                border-b border-slate-200
                dark:border-white/[0.06]
              ">

                <div className="flex items-center gap-3">

                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-red-400/70" />
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-yellow-400/70" />
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-green-400/70" />
                  </div>

                  <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />

                  <span className="
                    text-[11px]
                    font-medium
                    uppercase
                    tracking-[0.15em]
                    text-slate-400
                    dark:text-text-secondary
                  ">
                    Market overview
                  </span>

                </div>

                <div className="
                  flex items-center gap-2
                  text-[10px]
                  uppercase
                  tracking-[0.12em]
                  text-slate-400
                  dark:text-text-secondary
                ">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live
                </div>

              </div>

              {/* Market content */}
              <div className="relative h-72 sm:h-96 p-5">

                {/* Technical grid */}
                <div
                  className="
                    absolute inset-0
                    opacity-60
                    dark:opacity-[0.035]
                  "
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                  }}
                />

                {/* Instrument */}
                <div className="absolute top-5 left-5 z-10">
                  <div className="
                    text-[10px]
                    uppercase
                    tracking-[0.16em]
                    text-slate-400
                    dark:text-text-secondary
                    mb-2
                  ">
                    Synthetic Index
                  </div>

                  <div className="
                    text-xl sm:text-2xl
                    font-semibold
                    tracking-tight
                    text-slate-900
                    dark:text-text-primary
                  ">
                    R_100
                  </div>
                </div>

                {/* Abstract chart */}
                <svg
                  className="
                    absolute
                    inset-x-5
                    top-14
                    bottom-8
                    w-[calc(100%-40px)]
                    h-[calc(100%-78px)]
                  "
                  viewBox="0 0 1000 320"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="premiumChartFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.13" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <path
                    d="M0 250 L55 235 L110 245 L165 205 L220 215 L275 180 L330 194 L385 148 L440 165 L495 128 L550 145 L605 105 L660 124 L715 90 L770 110 L825 70 L880 92 L935 58 L1000 38 L1000 320 L0 320 Z"
                    fill="url(#premiumChartFill)"
                    className="text-brand-red"
                  />

                  <path
                    d="M0 250 L55 235 L110 245 L165 205 L220 215 L275 180 L330 194 L385 148 L440 165 L495 128 L550 145 L605 105 L660 124 L715 90 L770 110 L825 70 L880 92 L935 58 L1000 38"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    className="text-brand-red"
                  />
                </svg>

                {/* Floating data point */}
                <div className="
                  absolute
                  left-[67%]
                  top-[34%]
                  w-3 h-3
                  rounded-full
                  bg-brand-red
                  ring-8 ring-brand-red/10
                  dark:ring-brand-red/10
                " />

                {/* Price information */}
                <div className="
                  absolute top-5 right-5
                  text-right
                ">
                  <div className="
                    text-xl sm:text-2xl
                    font-semibold
                    tracking-tight
                    text-slate-900
                    dark:text-text-primary
                  ">
                    Market
                  </div>

                  <div className="
                    mt-1
                    text-xs
                    text-emerald-600
                    dark:text-green-400
                  ">
                    Real-time access
                  </div>
                </div>

                {/* Bottom labels */}
                <div className="
                  absolute bottom-4 left-5
                  flex items-center gap-5
                  text-[10px]
                  uppercase
                  tracking-[0.12em]
                  text-slate-400
                  dark:text-text-secondary
                ">
                  <span>1H</span>
                  <span className="text-brand-red font-semibold">4H</span>
                  <span>1D</span>
                  <span>1W</span>
                </div>

                <div className="
                  absolute bottom-4 right-5
                  flex items-center gap-2
                  text-[9px]
                  uppercase
                  tracking-[0.12em]
                  text-slate-400
                  dark:text-text-secondary
                ">
                  <BarChart3 className="w-3 h-3" />
                  Market data
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* =======================================================
            PLATFORM STATEMENT
            ======================================================= */}

        <section className="mt-28 sm:mt-36">

          <div className="
            grid lg:grid-cols-[1.1fr_0.9fr]
            gap-12 lg:gap-20
            items-end
          ">

            <div>

              <div className="
                flex items-center gap-3
                text-[10px]
                uppercase
                tracking-[0.25em]
                font-semibold
                text-brand-red
                mb-5
              ">
                <Sparkles className="w-3.5 h-3.5" />
                The platform
              </div>

              <h2 className="
                text-4xl sm:text-5xl lg:text-6xl
                font-bold
                tracking-[-0.045em]
                leading-[0.98]
                text-slate-950
                dark:text-text-primary
              ">
                One interface.
                <br />
                <span className="text-slate-400 dark:text-text-secondary">
                  Every opportunity.
                </span>
              </h2>

            </div>

            <p className="
              text-sm sm:text-base
              leading-relaxed
              text-slate-500
              dark:text-text-secondary
              max-w-lg
            ">
              Everything is designed around one principle:
              remove friction between you and the market.
              Connect your Deriv account and access a focused
              trading experience built for modern traders.
            </p>

          </div>
        </section>

        {/* =======================================================
            FEATURES — EDITORIAL STYLE
            ======================================================= */}

        <section className="mt-16 sm:mt-20">

          <div className="
            border-t border-slate-200
            dark:border-white/[0.07]
          ">

            <PremiumFeature
              number="01"
              icon={Shield}
              title="Secure by design"
              description="Your credentials stay with Deriv. Authentication happens through Deriv's official authorization flow."
            />

            <PremiumFeature
              number="02"
              icon={Zap}
              title="Built around speed"
              description="Access live markets and execute trades through your connected Deriv account without unnecessary friction."
            />

            <PremiumFeature
              number="03"
              icon={DollarSign}
              title="Transparent pricing"
              description="A clearly configured 3% markup is applied to trades executed through the platform."
            />

          </div>

        </section>

        {/* =======================================================
            BOT BUILDER FEATURE
            ======================================================= */}

        <section className="
          relative
          mt-20 sm:mt-28
          overflow-hidden
          rounded-[28px]
          border border-slate-200
          bg-white
          shadow-[0_25px_80px_rgba(15,23,42,0.07)]
          dark:border-white/[0.07]
          dark:bg-white/[0.025]
          dark:shadow-none
        ">

          <div className="
            absolute -right-32 -top-32
            w-96 h-96
            rounded-full
            bg-brand-red/[0.035]
            blur-3xl
            dark:bg-brand-red/5
          " />

          <div className="
            relative
            grid lg:grid-cols-2
            gap-10
            p-7 sm:p-10 lg:p-14
          ">

            <div className="flex flex-col justify-center">

              <div className="
                text-[10px]
                uppercase
                tracking-[0.25em]
                font-semibold
                text-brand-red
                mb-5
              ">
                Automated strategies
              </div>

              <h2 className="
                text-3xl sm:text-4xl
                font-bold
                tracking-[-0.04em]
                leading-tight
                text-slate-950
                dark:text-text-primary
                mb-5
              ">
                Build your strategy.
                <br />
                <span className="text-slate-400 dark:text-text-secondary">
                  Make it work for you.
                </span>
              </h2>

              <p className="
                text-sm sm:text-base
                leading-relaxed
                text-slate-500
                dark:text-text-secondary
                max-w-md
                mb-7
              ">
                Create automated trading strategies with the
                Bot Builder and move from an idea to execution
                without leaving the platform.
              </p>

              <div className="
                inline-flex items-center gap-2
                text-sm font-semibold
                text-slate-900
                dark:text-text-primary
              ">
                Explore Bot Builder
                <ArrowRight className="w-4 h-4 text-brand-red" />
              </div>

            </div>

            {/* Bot builder visual */}
            <div className="
              relative
              min-h-[300px]
              rounded-2xl
              border border-slate-200
              bg-slate-50
              p-5
              overflow-hidden
              dark:border-white/[0.07]
              dark:bg-black/20
            ">

              <div className="
                absolute top-4 left-5 right-5
                flex items-center justify-between
                text-[9px]
                uppercase
                tracking-[0.15em]
                text-slate-400
                dark:text-text-secondary
              ">
                <span>Bot Builder</span>
                <span className="text-emerald-500">Ready</span>
              </div>

              <div className="
                absolute
                left-5 right-5
                top-14
                space-y-3
              ">

                <BotBlock
                  title="TRADE PARAMETERS"
                  detail="Market · Contract · Duration"
                  accent
                />

                <div className="ml-6 w-px h-3 bg-slate-200 dark:bg-white/10" />

                <BotBlock
                  title="PURCHASE CONDITIONS"
                  detail="IF · THEN · Purchase"
                />

                <div className="ml-6 w-px h-3 bg-slate-200 dark:bg-white/10" />

                <BotBlock
                  title="TRADE RESULTS"
                  detail="Profit · Loss · Result"
                />

              </div>

            </div>

          </div>
        </section>

        {/* =======================================================
            HOW IT WORKS
            ======================================================= */}

        <section className="
          mt-20 sm:mt-28
          border-t
          border-slate-200
          dark:border-white/[0.07]
          pt-12 sm:pt-16
        ">

          <div className="max-w-xl mb-12">

            <div className="
              text-[10px]
              uppercase
              tracking-[0.25em]
              text-brand-red
              font-semibold
              mb-4
            ">
              Simple by design
            </div>

            <h2 className="
              text-3xl sm:text-4xl
              font-bold
              tracking-[-0.04em]
              text-slate-950
              dark:text-text-primary
              mb-4
            ">
              Start trading in minutes.
            </h2>

            <p className="
              text-sm sm:text-base
              text-slate-500
              dark:text-text-secondary
              leading-relaxed
            ">
              Connect your Deriv account, approve access,
              and start exploring the markets.
            </p>

          </div>

          <div className="
            grid grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-8
          ">

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
        </section>

        {/* =======================================================
            FINAL CTA
            ======================================================= */}

        <section className="
          relative
          text-center
          mt-24 sm:mt-36
          pb-10
        ">

          <div className="
            absolute
            left-1/2
            top-1/2
            -translate-x-1/2
            -translate-y-1/2
            w-72 h-40
            rounded-full
            bg-brand-red/[0.035]
            blur-3xl
            dark:bg-brand-red/5
          " />

          <div className="relative">

            <div className="
              text-[10px]
              uppercase
              tracking-[0.25em]
              text-slate-400
              dark:text-text-secondary
              mb-5
            ">
              Your next move
            </div>

            <h2 className="
              text-4xl sm:text-5xl
              font-bold
              tracking-[-0.05em]
              text-slate-950
              dark:text-text-primary
              mb-5
            ">
              Ready when you are.
            </h2>

            <p className="
              text-sm sm:text-base
              text-slate-500
              dark:text-text-secondary
              max-w-md
              mx-auto
              mb-8
            ">
              Connect your Deriv account and enter the markets
              through a platform built for modern trading.
            </p>

            <StartTradingButton />

          </div>

        </section>

      </main>
    </div>
  )
}

/* ===============================================================
   PREMIUM FEATURE ROW
   =============================================================== */

function PremiumFeature({
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
    <div className="
      group
      grid md:grid-cols-[80px_240px_1fr]
      gap-5 md:gap-8
      items-center
      py-7
      border-b
      border-slate-200
      dark:border-white/[0.07]
      transition-all duration-300
    ">

      <span className="
        text-xs
        font-mono
        text-slate-300
        dark:text-text-secondary/40
      ">
        {number}
      </span>

      <div className="flex items-center gap-3">

        <div className="
          flex items-center justify-center
          w-9 h-9
          rounded-xl
          bg-slate-100
          border border-slate-200
          group-hover:bg-brand-red/10
          group-hover:border-brand-red/20
          transition-colors
          dark:bg-white/[0.035]
          dark:border-white/[0.07]
        ">
          <Icon className="w-4 h-4 text-brand-red" />
        </div>

        <h3 className="
          font-semibold
          text-sm
          text-slate-900
          dark:text-text-primary
        ">
          {title}
        </h3>

      </div>

      <p className="
        text-sm
        leading-relaxed
        text-slate-500
        dark:text-text-secondary
        max-w-xl
      ">
        {description}
      </p>

    </div>
  )
}

/* ===============================================================
   BOT BUILDER VISUAL
   =============================================================== */

function BotBlock({
  title,
  detail,
  accent = false,
}: {
  title: string
  detail: string
  accent?: boolean
}) {
  return (
    <div className={`
      relative
      rounded-xl
      border
      p-4
      transition-all duration-300

      ${accent
        ? `
          border-brand-red/20
          bg-brand-red/[0.045]
          dark:bg-brand-red/[0.06]
        `
        : `
          border-slate-200
          bg-white
          dark:border-white/[0.07]
          dark:bg-white/[0.025]
        `
      }
    `}>

      <div className="flex items-center justify-between">

        <div>
          <div className="
            text-[9px]
            font-bold
            tracking-[0.14em]
            text-slate-700
            dark:text-text-primary
          ">
            {title}
          </div>

          <div className="
            mt-1.5
            text-[10px]
            text-slate-400
            dark:text-text-secondary
          ">
            {detail}
          </div>
        </div>

        <div className="
          w-2
          h-2
          rounded-full
          bg-brand-red
        " />

      </div>

    </div>
  )
}

/* ===============================================================
   STEP
   =============================================================== */

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

        <div className="
          flex items-center justify-center
          w-9 h-9
          rounded-xl
          bg-slate-100
          border border-slate-200
          dark:bg-white/[0.035]
          dark:border-white/[0.07]
        ">
          <Icon className="w-4 h-4 text-brand-red" />
        </div>

        <span className="
          text-xs
          font-mono
          text-slate-300
          dark:text-text-secondary/50
        ">
          {number}
        </span>

      </div>

      <h3 className="
        font-semibold
        text-sm
        mb-2
        text-slate-900
        dark:text-text-primary
      ">
        {title}
      </h3>

      <p className="
        text-xs sm:text-sm
        text-slate-500
        dark:text-text-secondary
        leading-relaxed
      ">
        {description}
      </p>

    </div>
  )
}

