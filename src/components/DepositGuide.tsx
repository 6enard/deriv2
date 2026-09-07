import { useState } from 'react'
import {
  User,
  Wallet,
  Building2,
  CreditCard,
  Globe,
  ArrowDownToLine,
  CircleCheck as CheckCircle2,
  ChevronDown,
  Shield,
  ExternalLink,
} from 'lucide-react'

const steps = [
  {
    icon: User,
    title: 'Log in to your Deriv account',
    description:
      "Go to deriv.com and sign in with your credentials. If you don't have an account yet, click \"Sign up\" and follow the registration process.",
  },
  {
    icon: Wallet,
    title: 'Navigate to the Cashier',
    description:
      'Once logged in, click on your balance at the top right of the page, then select "Deposit" from the dropdown menu. This will take you to the Cashier page.',
  },
  {
    icon: Building2,
    title: 'Select your payment method',
    description:
      'Deriv supports multiple payment methods including bank transfer, credit/debit cards, e-wallets (Skrill, Neteller, WebMoney, Perfect Money), and cryptocurrencies (Bitcoin, Ethereum, Litecoin, USDT, and more). Choose the one that works best for you.',
  },
  {
    icon: CreditCard,
    title: 'Enter the deposit amount',
    description:
      'Enter the amount you wish to deposit. Make sure it meets the minimum deposit requirement for your chosen payment method. The minimum is typically $10 USD or equivalent.',
  },
  {
    icon: Globe,
    title: 'Complete the transaction',
    description:
      'Follow the on-screen instructions for your chosen payment method. You may be redirected to a third-party payment gateway. Once the payment is confirmed, the funds will appear in your Deriv account.',
  },
  {
    icon: ArrowDownToLine,
    title: 'Transfer to your options wallet',
    description:
      'After depositing, your funds may be in your main Deriv account. To trade options on this platform, make sure your funds are in the correct wallet. Go to "Transfer" in the Cashier to move funds between your accounts if needed.',
  },
  {
    icon: CheckCircle2,
    title: 'Start trading',
    description:
      'Once your options wallet is funded, come back to DeriTraders, switch to your "Real" account using the toggle above, and you\'re ready to trade with real funds!',
  },
]

export default function DepositGuide({
  defaultExpanded = false,
}: {
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/[0.07] dark:bg-white/[0.025]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 sm:px-6 py-5"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center shrink-0">
            <ArrowDownToLine className="w-5 h-5 text-brand-green" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-text-primary">
              How to Deposit to Your Options Wallet
            </h3>
            <p className="text-sm text-slate-500 dark:text-text-secondary mt-0.5">
              Step-by-step guide to fund your Deriv account for real trading.
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 dark:text-text-muted transition-transform shrink-0 ml-4 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="px-5 sm:px-6 pb-6 space-y-4 fade-in">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="flex gap-4">
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-brand-green" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mt-2" />
                  )}
                </div>
                <div className="pt-1.5">
                  <span className="text-xs font-bold text-brand-green tabular">
                    Step {i + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-text-primary mb-1">
                    {step.title}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}

          <div className="rounded-xl bg-brand-blue/5 border border-brand-blue/20 px-4 py-3 mt-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-brand-blue" />
              <span className="text-xs font-bold text-brand-blue">
                Important Note
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-text-secondary leading-relaxed">
              DeriTraders does not handle deposits or withdrawals directly. All
              funding is managed through your Deriv account. Never share your
              Deriv password with anyone. DeriTraders staff will never ask for
              your password.
            </p>
          </div>

          <a
            href="https://app.deriv.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-green-dim transition-colors"
          >
            Open Deriv to deposit now
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  )
}
