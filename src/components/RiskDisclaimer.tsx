import { TriangleAlert } from 'lucide-react'

export default function RiskDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="w-4 h-4 text-brand-amber shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          <span className="font-semibold text-text-secondary">Risk Disclaimer:</span>{' '}
          Deriv offers complex derivatives, such as options and contracts for difference (&ldquo;CFDs&rdquo;). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products:
          You may lose some or all of the money you invest in the trade. If your trade involves currency conversion, exchange rates will affect your profit and loss. You should never trade with borrowed money or with money that you cannot afford to lose.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-amber/20 bg-brand-amber/[0.04] p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <TriangleAlert className="w-5 h-5 text-brand-amber shrink-0 mt-0.5" />
        <div className="text-xs sm:text-[13px] text-text-secondary leading-relaxed space-y-2.5">
          <p>
            <span className="font-semibold text-text-primary">Risk Disclaimer.</span>{' '}
            Deriv offers complex derivatives, such as options and contracts for difference (&ldquo;CFDs&rdquo;). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products:
          </p>
          <ul className="space-y-1.5 pl-1">
            <li className="flex items-start gap-2">
              <span className="text-brand-amber mt-0.5">&bull;</span>
              <span>You may lose some or all of the money you invest in the trade.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-amber mt-0.5">&bull;</span>
              <span>If your trade involves currency conversion, exchange rates will affect your profit and loss.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-amber mt-0.5">&bull;</span>
              <span>You should never trade with borrowed money or with money that you cannot afford to lose.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
