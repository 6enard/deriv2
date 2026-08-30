import type { RefObject } from 'react'
import { ChartBar as BarChart3, List, ScrollText, Trash2, RotateCcw } from 'lucide-react'
import type { OpenContract } from '../lib/types'
import type { RunStats, JournalEntry } from '../hooks/useBotRunner'

export type ResultsTab = 'summary' | 'transactions' | 'journal'

export function RunResultsPanel({
  tab,
  onTabChange,
  runStats,
  journal,
  journalEndRef,
  openContractList,
  currency,
  onClearJournal,
  onResetStats,
}: {
  tab: ResultsTab
  onTabChange: (t: ResultsTab) => void
  runStats: RunStats
  journal: JournalEntry[]
  journalEndRef: RefObject<HTMLDivElement | null>
  openContractList: OpenContract[]
  currency: string
  onClearJournal: () => void
  onResetStats: () => void
}) {
  const winRate = runStats.totalRuns > 0 ? (runStats.wins / runStats.totalRuns) * 100 : 0
  const isProfit = runStats.totalProfit >= 0

  return (
    <div className="bg-bg-secondary flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 pt-2.5 border-b border-border-default shrink-0">
        <ResultsTabButton active={tab === 'summary'} onClick={() => onTabChange('summary')} icon={BarChart3} label="Summary" />
        <ResultsTabButton active={tab === 'transactions'} onClick={() => onTabChange('transactions')} icon={List} label="Transactions" />
        <ResultsTabButton active={tab === 'journal'} onClick={() => onTabChange('journal')} icon={ScrollText} label="Journal" />
        <div className="ml-auto flex items-center gap-2 pr-1">
          {tab === 'journal' && journal.length > 0 && (
            <button onClick={onClearJournal} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
          <button onClick={onResetStats} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'summary' && (
          <div className="grid grid-cols-2 gap-3 p-4">
            <StatCard label="Total P/L" value={`${isProfit ? '+' : ''}${runStats.totalProfit.toFixed(2)} ${currency}`} color={isProfit ? 'text-brand-green' : 'text-brand-red'} />
            <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} color={winRate >= 50 ? 'text-brand-green' : 'text-text-primary'} />
            <StatCard label="Total Trades" value={String(runStats.totalRuns)} color="text-text-primary" />
            <StatCard label="Total Staked" value={`${runStats.totalStake.toFixed(2)} ${currency}`} color="text-text-primary" />
          </div>
        )}

        {tab === 'transactions' && (
          <div className="p-4">
            {openContractList.length === 0 ? (
              <div className="text-center text-sm text-text-muted py-8">No open contracts.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-muted border-b border-border-default">
                      <th className="pb-2 pr-3 font-medium">Symbol</th>
                      <th className="pb-2 pr-3 font-medium text-right">P/L</th>
                      <th className="pb-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openContractList.map((c) => {
                      const profit = c.profit
                      const isPos = profit >= 0
                      return (
                        <tr key={c.contract_id} className="border-b border-border-default/50">
                          <td className="py-2 pr-3 truncate max-w-[120px]" title={c.display_name || c.symbol}>{c.display_name || c.symbol}</td>
                          <td className={`py-2 pr-3 text-right tabular font-bold ${isPos ? 'text-brand-green' : 'text-brand-red'}`}>
                            {isPos ? '+' : ''}{profit.toFixed(2)}
                          </td>
                          <td className="py-2 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded ${c.is_sold ? 'bg-bg-tertiary text-text-secondary' : 'bg-brand-blue/15 text-brand-blue'}`}>
                              {c.is_sold ? c.status : 'Open'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'journal' && (
          <div className="p-3 space-y-1.5">
            {journal.length === 0 ? (
              <div className="text-center text-sm text-text-muted py-8">No journal entries yet.</div>
            ) : (
              journal.map((entry, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm py-1">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    entry.type === 'success' ? 'bg-brand-green' :
                    entry.type === 'error' ? 'bg-brand-red' :
                    entry.type === 'warn' ? 'bg-brand-amber' :
                    'bg-brand-blue'
                  }`} />
                  <span className="text-text-muted tabular text-xs shrink-0 pt-0.5">{entry.time.toLocaleTimeString()}</span>
                  <span className="text-text-secondary">{entry.message}</span>
                </div>
              ))
            )}
            <div ref={journalEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}

function ResultsTabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof BarChart3; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
        active ? 'text-text-primary border-b-2 border-brand-green' : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-bg-tertiary border border-border-light p-3">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className={`text-lg font-bold tabular ${color}`}>{value}</div>
    </div>
  )
}
