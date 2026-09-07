import { ArrowRight } from 'lucide-react'
import { useDerivAuth } from '../hooks/useDerivAuth'

export default function ConnectButton() {
  const { login, isLoading } = useDerivAuth()

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => { void login() }}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-brand-red text-white font-semibold text-lg hover:bg-brand-red-dim transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Sign in with Deriv
        <ArrowRight className="w-5 h-5" />
      </button>

      <p className="text-sm text-text-secondary text-center">
        Don't have a Deriv account?{' '}
        <a
          href="https://t.deriv.link?t=396G2MG2BR8N"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-red hover:text-brand-red-dim transition-colors"
        >
          Create one
        </a>
      </p>
    </div>
  )
}
