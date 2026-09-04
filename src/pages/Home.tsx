import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Shield,
  Loader as Loader2,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Bot,
  Lock,
  Activity,
  ChevronRight,
  TrendingUp,
  Star,
  Users,
  DollarSign,
  Clock,
  Layers,
  type LucideIcon,
} from 'lucide-react'
import { useDerivAuth } from '../hooks/useDerivAuth'

const marketBarItems = [
  { symbol: 'R_100', change: '+2.41%', positive: true },
  { symbol: 'R_75', change: '+1.82%', positive: true },
  { symbol: 'R_50', change: '-0.64%', positive: false },
  { symbol: 'BOOM 500', change: '+0.91%', positive: true },
  { symbol: 'CRASH 500', change: '-1.12%', positive: false },
  { symbol: 'R_25', change: '+3.27%', positive: true },
  { symbol: 'BOOM 1000', change: '+1.45%', positive: true },
  { symbol: 'CRASH 1000', change: '-0.88%', positive: false },
  { symbol: 'STEP INDEX', change: '+0.12%', positive: true },
  { symbol: 'JUMP INDEX', change: '-0.34%', positive: false },
]

const testimonials = [
  {
    name: 'Sarah Chen',
    occupation: 'Day Trader',
    review: 'DeriTraders completely transformed how I approach the markets. The bot builder is incredibly intuitive and the execution speed is unmatched.',
  },
  {
    name: 'Marcus Rodriguez',
    occupation: 'Crypto Analyst',
    review: 'I have tried many trading platforms, but the seamless Deriv integration and real-time data on DeriTraders is on another level entirely.',
  },
  {
    name: 'Aisha Patel',
    occupation: 'Quant Researcher',
    review: 'The block-based bot builder lets me prototype and test strategies in minutes instead of hours. A game changer for my workflow.',
  },
  {
    name: 'James Okafor',
    occupation: 'Swing Trader',
    review: 'Being able to switch between demo and real accounts instantly makes risk management effortless. Highly recommend to any serious trader.',
  },
  {
    name: 'Yuki Tanaka',
    occupation: 'Algorithmic Trader',
    review: 'The platform is fast, reliable, and the UI is beautiful. I run multiple bots simultaneously without any performance issues.',
  },
  {
    name: 'Elena Volkov',
    occupation: 'Portfolio Manager',
    review: 'DeriTraders gives me the tools I need to manage multiple positions with confidence. The portfolio view is clean and informative.',
  },
]

/* =========================================================
   START TRADING BUTTON
   ========================================================= */

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
        group relative inline-flex items-center justify-center
        gap-3 px-7 sm:px-8 py-4
        rounded-xl
        bg-brand-red
        text-white
        font-semibold
        shadow-[0_10px_35px_rgba(255,45,85,0.18)]
        hover:shadow-[0_14px_45px_rgba(255,45,85,0.30)]
        hover:-translate-y-0.5
        active:translate-y-0
        transition-all duration-300
        disabled:opacity-60
        disabled:cursor-not-allowed
        overflow-hidden
      "
    >
      <span
        className="
          absolute inset-0
          bg-gradient-to-r
          from-transparent
          via-white/15
          to-transparent
          -translate-x-full
          group-hover:translate-x-full
          transition-transform duration-700
        "
      />

      <span className="relative">
        {isLoading ? 'Connecting...' : 'Start Trading'}
      </span>

      <ArrowRight
        className="
          relative w-5 h-5
          group-hover:translate-x-1
          transition-transform
        "
      />
    </button>
  )
}

/* =========================================================
   HOME
   ========================================================= */

export default function Home() {
  const { isAuthenticated, isLoading, error } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div
      className="
        relative min-h-screen overflow-hidden
        bg-[#f8f9fb]
        text-slate-950
        dark:bg-transparent
        dark:text-text-primary
      "
    >
      {/* =====================================================
          LIGHT MODE BACKGROUND
          ===================================================== */}

      <div className="pointer-events-none absolute inset-0 dark:hidden">
        <div
          className="
            absolute
            -top-[320px]
            left-1/2
            -translate-x-1/2
            w-[900px]
            h-[650px]
            rounded-full
            bg-brand-red/[0.035]
            blur-[130px]
            drift
          "
        />

        <div
          className="
            absolute
            right-[-250px]
            top-[25%]
            w-[550px]
            h-[550px]
            rounded-full
            bg-slate-200/50
            blur-[130px]
            drift-slow
          "
        />

        <div
          className="
            absolute
            left-[-250px]
            bottom-[10%]
            w-[500px]
            h-[500px]
            rounded-full
            bg-slate-200/40
            blur-[130px]
            float
          "
        />

        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(rgba(15,23,42,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(15,23,42,0.025) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* =====================================================
          DARK MODE BACKGROUND
          ===================================================== */}

      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div
          className="
            absolute
            left-1/2
            -top-[300px]
            h-[600px]
            w-[900px]
            -translate-x-1/2
            rounded-full
            bg-brand-red/10
            blur-[140px]
            drift
          "
        />

        <div
          className="
            absolute
            right-[-200px]
            top-[25%]
            h-[400px]
            w-[400px]
            rounded-full
            bg-brand-red/5
            blur-[120px]
            drift-slow
          "
        />

        <div
          className="
            absolute
            left-[-200px]
            bottom-[10%]
            h-[350px]
            w-[350px]
            rounded-full
            bg-purple-500/5
            blur-[120px]
            float
          "
        />
      </div>

      <main
        className="
          relative
          max-w-7xl
          mx-auto
          px-5 sm:px-8 lg:px-10
          py-12 sm:py-20 lg:py-24
        "
      >
        {/* ===================================================
            HERO
            =================================================== */}

        <section className="max-w-5xl mx-auto text-center">
          {/* Deriv status */}

          <div
            className="
              inline-flex items-center gap-2.5
              px-4 py-2
              rounded-full
              border
              border-slate-200
              bg-white/80
              shadow-[0_8px_30px_rgba(15,23,42,0.05)]
              backdrop-blur-xl
              text-xs sm:text-sm
              text-slate-500
              dark:border-white/[0.08]
              dark:bg-white/[0.035]
              dark:text-text-secondary
              dark:shadow-lg
              fade-in-down
            "
          >
            <span className="relative flex w-2 h-2">
              <span
                className="
                  absolute
                  inline-flex
                  w-full h-full
                  rounded-full
                  bg-brand-red
                  opacity-40
                  animate-ping
                "
              />

              <span className="relative w-2 h-2 rounded-full bg-brand-red" />
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

          {/* Eyebrow */}

          <div
            className="
              flex
              items-center
              justify-center
              gap-3
              mt-8
              mb-5
              text-[10px]
              sm:text-xs
              uppercase
              tracking-[0.28em]
              font-semibold
              text-slate-400
              dark:text-text-secondary
              fade-in-up
            "
            style={{ animationDelay: '0.1s' }}
          >
            <span className="w-8 h-px bg-slate-300 dark:bg-white/10" />

            Next generation trading.

            <span className="w-8 h-px bg-slate-300 dark:bg-white/10" />
          </div>

          {/* Main headline */}

          <h1
            className="
              text-5xl
              sm:text-6xl
              lg:text-7xl
              xl:text-[88px]
              font-bold
              tracking-[-0.055em]
              leading-[0.94]
              fade-in-up
            "
            style={{ animationDelay: '0.2s' }}
          >
            <span className="block text-slate-950 dark:text-text-primary">
              Trade smarter.
            </span>

            <span className="block text-brand-red">
              Move faster.
            </span>
          </h1>

          <p
            className="
              max-w-2xl
              mx-auto
              mt-7
              text-base
              sm:text-lg
              leading-relaxed
              text-slate-500
              dark:text-text-secondary
              fade-in-up
            "
            style={{ animationDelay: '0.35s' }}
          >
            Access global markets through a powerful trading
            platform connected directly to your Deriv account.
          </p>

          {/* CTA */}

          <div className="mt-10 flex flex-col items-center gap-5 fade-in-up" style={{ animationDelay: '0.5s' }}>
            {isLoading ? (
              <div
                className="
                  flex
                  items-center
                  gap-3
                  py-4
                  text-slate-500
                  dark:text-text-secondary
                "
              >
                <Loader2 className="w-5 h-5 animate-spin text-brand-red" />

                <span>Connecting to Deriv...</span>
              </div>
            ) : error ? (
              <div className="max-w-md w-full space-y-4">
                <div
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-5 py-4
                    text-sm
                    text-red-600
                    dark:border-brand-red/20
                    dark:bg-brand-red/10
                    dark:text-brand-red
                  "
                >
                  {error}
                </div>

                <StartTradingButton />
              </div>
            ) : (
              <StartTradingButton />
            )}

            <div
              className="
                flex
                flex-wrap
                justify-center
                items-center
                gap-x-5
                gap-y-2
                text-xs
                text-slate-400
                dark:text-text-secondary
                fade-in-up
              "
              style={{ animationDelay: '0.65s' }}
            >
              <TrustItem text="Secure authentication" />

              <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20" />

              <TrustItem text="Real-time markets" />

              <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20" />

              <TrustItem text="Built for traders" />
            </div>
          </div>
        </section>

        {/* ===================================================
            MOVING MARKET BAR
            =================================================== */}

        <section className="mt-12 sm:mt-16 fade-in-up">
          <div
            className="
              relative overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              dark:border-white/[0.07]
              dark:bg-white/[0.025]
            "
          >
            <div className="flex marquee-left">
              {marketBarItems.concat(marketBarItems).map((item, i) => (
                <MarketBarItem key={i} {...item} />
              ))}
            </div>

            <div
              className="
                pointer-events-none absolute inset-y-0 left-0 w-16
                bg-gradient-to-r from-white to-transparent
                dark:from-bg-secondary
              "
            />
            <div
              className="
                pointer-events-none absolute inset-y-0 right-0 w-16
                bg-gradient-to-l from-white to-transparent
                dark:from-bg-secondary
              "
            />
          </div>
        </section>

        {/* ===================================================
            TESTIMONIALS MARQUEE
            =================================================== */}

        <section className="mt-20 sm:mt-28 fade-in-up">
          <SectionHeading
            eyebrow="Testimonials"
            title="Loved by traders worldwide"
            description="Real experiences from the DeriTraders community."
          />

          <div className="mt-8 overflow-hidden">
            <div className="flex marquee-left-slow gap-5">
              {testimonials.concat(testimonials).map((t, i) => (
                <TestimonialCard key={i} {...t} />
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================
            MARKET TICKER
            =================================================== */}

        <section className="mt-20 sm:mt-24 fade-in-up">
          <SectionHeading
            eyebrow="Markets"
            title="Markets at a glance"
            description="Explore instruments available through your connected Deriv account."
          />

          <div
            className="
              mt-8
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-[0_15px_50px_rgba(15,23,42,0.05)]
              dark:border-white/[0.07]
              dark:bg-white/[0.025]
              dark:shadow-none
              fade-in-scale
            "
            style={{ animationDelay: '0.15s' }}
          >
            <div
              className="
                flex
                min-w-max
                divide-x
                divide-slate-200
                dark:divide-white/[0.07]
              "
            >
              <MarketTicker
                symbol="R_100"
                type="Synthetic Index"
                change="+2.41%"
                positive
              />

              <MarketTicker
                symbol="R_75"
                type="Synthetic Index"
                change="+1.82%"
                positive
              />

              <MarketTicker
                symbol="R_50"
                type="Synthetic Index"
                change="-0.64%"
              />

              <MarketTicker
                symbol="BOOM 500"
                type="Synthetic"
                change="+0.91%"
                positive
              />

              <MarketTicker
                symbol="CRASH 500"
                type="Synthetic"
                change="-1.12%"
              />
            </div>
          </div>

          <p className="mt-3 text-[10px] text-slate-400 dark:text-text-secondary/50">
            Illustrative market data — values shown are examples only.
          </p>
        </section>

        {/* ===================================================
            MARKET TABLE
            =================================================== */}

        <section className="mt-20 sm:mt-28 fade-in-up">
          <div
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              overflow-hidden
              shadow-[0_15px_50px_rgba(15,23,42,0.04)]
              dark:border-white/[0.07]
              dark:bg-white/[0.025]
              dark:shadow-none
              fade-in-scale
            "
            style={{ animationDelay: '0.15s' }}
          >
            <div
              className="
                flex
                items-center
                justify-between
                px-5 sm:px-7
                py-5
                border-b
                border-slate-200
                dark:border-white/[0.07]
              "
            >
              <div>
                <div
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.22em]
                    font-semibold
                    text-brand-red
                    mb-1.5
                  "
                >
                  Market discovery
                </div>

                <h2
                  className="
                    text-xl
                    sm:text-2xl
                    font-bold
                    tracking-tight
                    text-slate-950
                    dark:text-text-primary
                  "
                >
                  Available markets
                </h2>
              </div>

              <Activity className="w-5 h-5 text-slate-300 dark:text-text-secondary/40" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr
                    className="
                      border-b
                      border-slate-100
                      dark:border-white/[0.05]
                      text-left
                      text-[10px]
                      uppercase
                      tracking-[0.16em]
                      text-slate-400
                    "
                  >
                    <th className="px-5 sm:px-7 py-4 font-medium">
                      Market
                    </th>

                    <th className="px-5 sm:px-7 py-4 font-medium">
                      Type
                    </th>

                    <th className="px-5 sm:px-7 py-4 font-medium">
                      Status
                    </th>

                    <th className="px-5 sm:px-7 py-4" />
                  </tr>
                </thead>

                <tbody>
                  <MarketRow
                    symbol="R_100"
                    type="Synthetic Index"
                  />

                  <MarketRow
                    symbol="R_75"
                    type="Synthetic Index"
                  />

                  <MarketRow
                    symbol="R_50"
                    type="Synthetic Index"
                  />

                  <MarketRow
                    symbol="Boom 500"
                    type="Synthetic Index"
                  />

                  <MarketRow
                    symbol="Crash 500"
                    type="Synthetic Index"
                    last
                  />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ===================================================
            PRODUCT SECTION
            =================================================== */}

        <section className="mt-20 sm:mt-28 fade-in-up">
          <SectionHeading
            eyebrow="Products"
            title="Built for every trading style"
            description="Choose the tools that match the way you trade."
          />

          <div className="grid md:grid-cols-3 gap-5 mt-8">
            <ProductCard
              icon={BarChart3}
              title="Manual Trading"
              description="Trade directly through a focused interface designed for fast execution."
              label="Trading terminal"
            />

            <ProductCard
              icon={Bot}
              title="Bot Builder"
              description="Build automated strategies visually using powerful block-based logic."
              label="Automation"
              featured
            />

            <ProductCard
              icon={TrendingUp}
              title="Smart Trading"
              description="Combine market access and automation in one modern platform."
              label="Strategy"
            />
          </div>
        </section>

        {/* ===================================================
            BOT BUILDER SHOWCASE
            =================================================== */}

        <section
          className="
            relative
            mt-20 sm:mt-28
            overflow-hidden
            rounded-3xl
            border
            border-slate-200
            bg-white
            shadow-[0_25px_80px_rgba(15,23,42,0.07)]
            dark:border-white/[0.07]
            dark:bg-white/[0.025]
            dark:shadow-none
            fade-in-up
          "
        >
          <div
            className="
              absolute
              right-[-160px]
              top-[-160px]
              w-[450px]
              h-[450px]
              rounded-full
              bg-brand-red/[0.035]
              blur-3xl
              dark:bg-brand-red/5
              float
            "
          />

          <div
            className="
              relative
              grid
              lg:grid-cols-[0.85fr_1.15fr]
              gap-12
              p-7
              sm:p-10
              lg:p-14
            "
          >
            <div className="flex flex-col justify-center slide-in-left">
              <div
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.24em]
                  font-semibold
                  text-brand-red
                  mb-5
                "
              >
                Automated strategies
              </div>

              <h2
                className="
                  text-3xl
                  sm:text-4xl
                  lg:text-5xl
                  font-bold
                  tracking-[-0.045em]
                  leading-[1]
                  text-slate-950
                  dark:text-text-primary
                "
              >
                Automate
                <br />
                your strategy.
              </h2>

              <p
                className="
                  mt-5
                  max-w-md
                  text-sm
                  sm:text-base
                  leading-relaxed
                  text-slate-500
                  dark:text-text-secondary
                "
              >
                Build, test, and execute trading logic visually
                with the platform's powerful Bot Builder.
              </p>

              <div
                className="
                  mt-7
                  inline-flex
                  items-center
                  gap-2
                  text-sm
                  font-semibold
                  text-slate-900
                  dark:text-text-primary
                "
              >
                Explore Bot Builder

                <ArrowRight className="w-4 h-4 text-brand-red" />
              </div>
            </div>

            {/* Bot visual */}

            <div
              className="
                relative
                min-h-[350px]
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                p-5
                overflow-hidden
                dark:border-white/[0.07]
                dark:bg-black/20
                slide-in-right
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  pb-4
                  border-b
                  border-slate-200
                  dark:border-white/[0.06]
                "
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-red" />

                  <span
                    className="
                      text-[10px]
                      uppercase
                      tracking-[0.16em]
                      font-semibold
                      text-slate-600
                      dark:text-text-secondary
                    "
                  >
                    Bot Builder
                  </span>
                </div>

                <span
                  className="
                    flex
                    items-center
                    gap-1.5
                    text-[9px]
                    uppercase
                    tracking-[0.12em]
                    text-emerald-500
                  "
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Ready
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <BotBlock
                  title="TRADE PARAMETERS"
                  detail="Market · Contract · Duration"
                  active
                />

                <Connector />

                <BotBlock
                  title="PURCHASE CONDITIONS"
                  detail="IF condition → Purchase"
                />

                <Connector />

                <BotBlock
                  title="TRADE RESULTS"
                  detail="Profit · Loss · Result"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================
            PLATFORM STATS
            =================================================== */}

        <section className="mt-20 sm:mt-28 fade-in-up">
          <div
            className="
              border-y
              border-slate-200
              dark:border-white/[0.07]
            "
          >
            <div className="grid grid-cols-2 lg:grid-cols-4">
              <PlatformStat
                icon={Users}
                target={12400}
                suffix="+"
                label="Active Traders"
              />

              <PlatformStat
                icon={DollarSign}
                target={48}
                prefix="$"
                suffix="M+"
                label="Trading Volume"
              />

              <PlatformStat
                icon={Clock}
                target={99.9}
                suffix="%"
                decimals={1}
                label="Uptime"
              />

              <PlatformStat
                icon={Layers}
                target={50}
                suffix="+"
                label="Trading Pairs"
                last
              />
            </div>
          </div>
        </section>

        {/* ===================================================
            SECURITY
            =================================================== */}

        <section className="mt-20 sm:mt-28 fade-in-up">
          <div
            className="
              grid
              lg:grid-cols-[0.7fr_1.3fr]
              gap-12
              items-start
            "
          >
            <div>
              <div
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.24em]
                  font-semibold
                  text-brand-red
                  mb-4
                "
              >
                Security
              </div>

              <h2
                className="
                  text-3xl
                  sm:text-4xl
                  font-bold
                  tracking-[-0.04em]
                  text-slate-950
                  dark:text-text-primary
                "
              >
                Built with
                <br />
                security in mind.
              </h2>
            </div>

            <div
              className="
                border-t
                border-slate-200
                dark:border-white/[0.07]
              "
            >
              <SecurityRow
                icon={Lock}
                title="Deriv Authentication"
                description="Authenticate through Deriv's official authorization flow."
              />

              <SecurityRow
                icon={Shield}
                title="Protected Access"
                description="The platform does not ask users for their Deriv password directly."
              />

              <SecurityRow
                icon={CheckCircle2}
                title="Controlled Trading"
                description="Trading access is granted through your connected Deriv account."
                last
              />
            </div>
          </div>
        </section>

        {/* ===================================================
            HOW IT WORKS
            =================================================== */}

        <section className="mt-20 sm:mt-28 fade-in-up">
          <SectionHeading
            eyebrow="Getting started"
            title="Start trading in minutes."
            description="Connect your Deriv account and get straight to the markets."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
            <Step
              number="01"
              title="Sign in"
              description="Connect securely through Deriv's official authorization page."
            />

            <Step
              number="02"
              title="Approve"
              description="Review the requested permissions and approve access."
            />

            <Step
              number="03"
              title="Trade"
              description="Explore markets and place trades through the platform."
            />

            <Step
              number="04"
              title="Build"
              description="Create automated strategies using the Bot Builder."
            />
          </div>
        </section>

        {/* ===================================================
            FINAL CTA
            =================================================== */}

        <section
          className="
            relative
            mt-24
            sm:mt-36
            pb-10
            text-center
            fade-in-up
          "
        >
          <div
            className="
              absolute
              left-1/2
              top-1/2
              -translate-x-1/2
              -translate-y-1/2
              w-96
              h-48
              rounded-full
              bg-brand-red/[0.035]
              blur-3xl
              dark:bg-brand-red/5
              pulse-ring
            "
          />

          <div className="relative">
            <div
              className="
                text-[10px]
                uppercase
                tracking-[0.26em]
                font-semibold
                text-slate-400
                dark:text-text-secondary
                mb-5
              "
            >
              Your next move
            </div>

            <h2
              className="
                text-4xl
                sm:text-5xl
                lg:text-6xl
                font-bold
                tracking-[-0.05em]
                text-slate-950
                dark:text-text-primary
              "
            >
              Your next trade
              <br />
              <span className="text-brand-red">
                starts here.
              </span>
            </h2>

            <p
              className="
                max-w-md
                mx-auto
                mt-5
                mb-8
                text-sm
                sm:text-base
                leading-relaxed
                text-slate-500
                dark:text-text-secondary
              "
            >
              Connect your Deriv account and enter the markets
              through a modern trading experience.
            </p>

            <StartTradingButton />
          </div>
        </section>
      </main>
    </div>
  )
}

/* =========================================================
   TRUST ITEM
   ========================================================= */

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <CheckCircle2 className="w-3.5 h-3.5 text-brand-red" />
      <span>{text}</span>
    </div>
  )
}

/* =========================================================
   SECTION HEADING
   ========================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="max-w-2xl">
      <div
        className="
          text-[10px]
          uppercase
          tracking-[0.24em]
          font-semibold
          text-brand-red
          mb-3
        "
      >
        {eyebrow}
      </div>

      <h2
        className="
          text-3xl
          sm:text-4xl
          font-bold
          tracking-[-0.04em]
          text-slate-950
          dark:text-text-primary
        "
      >
        {title}
      </h2>

      <p
        className="
          mt-3
          text-sm
          sm:text-base
          leading-relaxed
          text-slate-500
          dark:text-text-secondary
        "
      >
        {description}
      </p>
    </div>
  )
}

/* =========================================================
   MARKET TICKER
   ========================================================= */

function MarketTicker({
  symbol,
  type,
  change,
  positive = false,
}: {
  symbol: string
  type: string
  change: string
  positive?: boolean
}) {
  return (
    <div
      className="
        min-w-[190px]
        sm:min-w-[210px]
        px-5
        py-5
      "
    >
      <div className="flex items-center justify-between gap-5">
        <div>
          <div
            className="
              text-sm
              font-semibold
              text-slate-900
              dark:text-text-primary
            "
          >
            {symbol}
          </div>

          <div
            className="
              mt-1
              text-[10px]
              text-slate-400
              dark:text-text-secondary
            "
          >
            {type}
          </div>
        </div>

        <span
          className={`
            text-xs font-semibold
            ${positive ? 'text-emerald-500' : 'text-red-500'}
          `}
        >
          {change}
        </span>
      </div>
    </div>
  )
}

/* =========================================================
   MARKET ROW
   ========================================================= */

function MarketRow({
  symbol,
  type,
  last = false,
}: {
  symbol: string
  type: string
  last?: boolean
}) {
  return (
    <tr
      className={`
        group
        hover:bg-slate-50
        dark:hover:bg-white/[0.025]
        transition-colors
        fade-in-up
        ${!last ? 'border-b border-slate-100 dark:border-white/[0.05]' : ''}
      `}
    >
      <td className="px-5 sm:px-7 py-5">
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              items-center
              justify-center
              w-8
              h-8
              rounded-lg
              bg-slate-100
              dark:bg-white/[0.04]
            "
          >
            <BarChart3 className="w-3.5 h-3.5 text-brand-red" />
          </div>

          <span
            className="
              text-sm
              font-semibold
              text-slate-900
              dark:text-text-primary
            "
          >
            {symbol}
          </span>
        </div>
      </td>

      <td
        className="
          px-5 sm:px-7
          py-5
          text-sm
          text-slate-500
          dark:text-text-secondary
        "
      >
        {type}
      </td>

      <td className="px-5 sm:px-7 py-5">
        <span
          className="
            inline-flex
            items-center
            gap-1.5
            text-xs
            text-emerald-500
          "
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Available
        </span>
      </td>

      <td className="px-5 sm:px-7 py-5 text-right">
        <ChevronRight
          className="
            inline-block
            w-4
            h-4
            text-slate-300
            group-hover:text-brand-red
            group-hover:translate-x-1
            transition-all
            dark:text-text-secondary/30
          "
        />
      </td>
    </tr>
  )
}

/* =========================================================
   PRODUCT CARD
   ========================================================= */

function ProductCard({
  icon: Icon,
  title,
  description,
  label,
  featured = false,
}: {
  icon: LucideIcon
  title: string
  description: string
  label: string
  featured?: boolean
}) {
  return (
    <div
      className={`
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        p-6
        sm:p-7
        transition-all
        duration-300
        hover:-translate-y-1
        fade-in-scale

        ${
          featured
            ? `
              border-brand-red/20
              bg-brand-red/[0.035]
              dark:bg-brand-red/[0.045]
            `
            : `
              border-slate-200
              bg-white
              hover:border-slate-300
              dark:border-white/[0.07]
              dark:bg-white/[0.025]
              dark:hover:border-white/[0.12]
            `
        }
      `}
    >
      <div
        className="
          flex
          items-center
          justify-between
          mb-8
        "
      >
        <div
          className="
            flex
            items-center
            justify-center
            w-11
            h-11
            rounded-xl
            bg-slate-100
            border
            border-slate-200
            dark:bg-white/[0.04]
            dark:border-white/[0.07]
          "
        >
          <Icon className="w-5 h-5 text-brand-red" />
        </div>

        <span
          className="
            text-[9px]
            uppercase
            tracking-[0.16em]
            text-slate-400
            dark:text-text-secondary
          "
        >
          {label}
        </span>
      </div>

      <h3
        className="
          text-lg
          font-semibold
          text-slate-900
          dark:text-text-primary
          mb-2
        "
      >
        {title}
      </h3>

      <p
        className="
          text-sm
          leading-relaxed
          text-slate-500
          dark:text-text-secondary
        "
      >
        {description}
      </p>

      <div
        className="
          flex
          items-center
          gap-2
          mt-6
          text-xs
          font-semibold
          text-slate-700
          dark:text-text-primary
        "
      >
        Explore
        <ArrowRight
          className="
            w-3.5
            h-3.5
            text-brand-red
            group-hover:translate-x-1
            transition-transform
          "
        />
      </div>
    </div>
  )
}

/* =========================================================
   BOT BLOCK
   ========================================================= */

function BotBlock({
  title,
  detail,
  active = false,
}: {
  title: string
  detail: string
  active?: boolean
}) {
  return (
    <div
      className={`
        rounded-xl
        border
        p-4
        fade-in-up
        ${
          active
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
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className="
              text-[9px]
              font-bold
              tracking-[0.14em]
              text-slate-700
              dark:text-text-primary
            "
          >
            {title}
          </div>

          <div
            className="
              mt-1.5
              text-[10px]
              text-slate-400
              dark:text-text-secondary
            "
          >
            {detail}
          </div>
        </div>

        <span className="w-2 h-2 rounded-full bg-brand-red" />
      </div>
    </div>
  )
}

/* =========================================================
   CONNECTOR
   ========================================================= */

function Connector() {
  return (
    <div className="flex justify-center">
      <div className="w-px h-3 bg-slate-200 dark:bg-white/10" />
    </div>
  )
}

/* =========================================================
   SECURITY ROW
   ========================================================= */

function SecurityRow({
  icon: Icon,
  title,
  description,
  last = false,
}: {
  icon: LucideIcon
  title: string
  description: string
  last?: boolean
}) {
  return (
    <div
      className={`
        flex
        gap-4
        py-6
        fade-in-up
        ${
          !last
            ? 'border-b border-slate-200 dark:border-white/[0.07]'
            : ''
        }
      `}
    >
      <div
        className="
          flex
          items-center
          justify-center
          w-9
          h-9
          shrink-0
          rounded-lg
          bg-slate-100
          border
          border-slate-200
          dark:bg-white/[0.04]
          dark:border-white/[0.07]
        "
      >
        <Icon className="w-4 h-4 text-brand-red" />
      </div>

      <div>
        <h3
          className="
            text-sm
            font-semibold
            text-slate-900
            dark:text-text-primary
          "
        >
          {title}
        </h3>

        <p
          className="
            mt-1.5
            text-sm
            leading-relaxed
            text-slate-500
            dark:text-text-secondary
          "
        >
          {description}
        </p>
      </div>
    </div>
  )
}

/* =========================================================
   STEP
   ========================================================= */

function Step({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="fade-in-up">
      <div
        className="
          text-2xl
          font-mono
          font-medium
          text-brand-red
          mb-5
        "
      >
        {number}
      </div>

      <h3
        className="
          text-sm
          font-semibold
          text-slate-900
          dark:text-text-primary
          mb-2
        "
      >
        {title}
      </h3>

      <p
        className="
          text-xs
          sm:text-sm
          leading-relaxed
          text-slate-500
          dark:text-text-secondary
        "
      >
        {description}
      </p>
    </div>
  )
}

/* =========================================================
   MARKET BAR ITEM
   ========================================================= */

function MarketBarItem({
  symbol,
  change,
  positive,
}: {
  symbol: string
  change: string
  positive: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 px-6 py-4 shrink-0">
      <span className="text-sm font-semibold text-slate-900 dark:text-text-primary">
        {symbol}
      </span>
      <span
        className={`text-sm font-bold tabular ${positive ? 'text-emerald-500' : 'text-red-500'}`}
      >
        {change}
      </span>
      <span className="text-slate-200 dark:text-white/10">|</span>
    </div>
  )
}

/* =========================================================
   TESTIMONIAL CARD
   ========================================================= */

function TestimonialCard({
  name,
  occupation,
  review,
}: {
  name: string
  occupation: string
  review: string
}) {
  return (
    <div
      className="
        shrink-0 w-[340px] sm:w-[380px]
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-6
        shadow-[0_8px_30px_rgba(15,23,42,0.04)]
        dark:border-white/[0.07]
        dark:bg-white/[0.025]
        dark:shadow-none
      "
    >
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4 fill-brand-amber text-brand-amber"
          />
        ))}
      </div>

      <p
        className="
          text-sm
          leading-relaxed
          text-slate-600
          dark:text-text-secondary
          mb-5
          min-h-[80px]
        "
      >
        &ldquo;{review}&rdquo;
      </p>

      <div className="flex items-center gap-3">
        <div
          className="
            flex items-center justify-center
            w-10 h-10
            rounded-full
            bg-brand-red/10
            text-brand-red
            font-bold text-sm
          "
        >
          {name.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-text-primary">
            {name}
          </div>
          <div className="text-xs text-slate-400 dark:text-text-muted">
            {occupation}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   PLATFORM STAT
   ========================================================= */

function PlatformStat({
  icon: Icon,
  target,
  label,
  prefix = '',
  suffix = '',
  decimals = 0,
  last = false,
}: {
  icon: LucideIcon
  target: number
  label: string
  prefix?: string
  suffix?: string
  decimals?: number
  last?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [display, setDisplay] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          setStarted(true)
        }
      },
      { threshold: 0.3 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return

    const duration = 1800
    const startTime = performance.now()

    let raf = 0

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(target * eased)

      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setDisplay(target)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, target])

  const formatted = display.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <div
      ref={ref}
      className={`
        px-5 sm:px-7 py-8 fade-in-up
        ${!last ? 'border-r border-slate-200 dark:border-white/[0.07]' : ''}
      `}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-brand-red" />
      </div>

      <div
        className="
          text-2xl sm:text-3xl
          font-bold
          tracking-tight
          text-slate-900
          dark:text-text-primary
        "
      >
        {prefix}{formatted}{suffix}
      </div>

      <div
        className="
          mt-2
          text-[10px]
          uppercase
          tracking-[0.16em]
          text-slate-400
          dark:text-text-secondary
        "
      >
        {label}
      </div>
    </div>
  )
}

