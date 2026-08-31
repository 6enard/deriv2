import { useState, type RefObject } from 'react'
import { ChartBar as BarChart3, List, ScrollText, Trash2, RotateCcw, TrendingUp, TrendingDown, Trophy, Target, Wallet, Activity, DollarSign, Download, Eye, X } from 'lucide-react'
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
  const [detailContract, setDetailContract] = useState<OpenContract | null>(null)

  const downloadTransactionsCsv = () => {
    const headers = ['Symbol', 'Type', 'Entry Spot', 'Exit Spot', 'Buy Price', 'P/L', 'Status']
    const rows = openContractList.map((c) => [
      c.display_name || c.symbol,
      c.contract_type || '—',
      c.entry_spot != null ? String(c.entry_spot) : '—',
      c.exit_spot != null ? String(c.exit_spot) : '—',
      c.buy_price.toFixed(2),
      c.profit.toFixed(2),
      c.is_sold ? c.status : 'Open',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    triggerDownload(csv, `transactions-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const downloadJournalTxt = () => {
    const text = journal
      .map((e) => `[${e.time.toLocaleString()}] ${e.type.toUpperCase()} — ${e.message}`)
      .join('\n')
    triggerDownload(text, `journal-${new Date().toISOString().slice(0, 10)}.txt`)
  }

  return (
    <div className="bg-bg-secondary flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 pt-2.5 border-b border-border-default shrink-0">
        <ResultsTabButton active={tab === 'summary'} onClick={() => onTabChange('summary')} icon={BarChart3} label="Summary" />
        <ResultsTabButton active={tab === 'transactions'} onClick={() => onTabChange('transactions')} icon={List} label="Transactions" />
        <ResultsTabButton active={tab === 'journal'} onClick={() => onTabChange('journal')} icon={ScrollText} label="Journal" />
        <div className="ml-auto flex items-center gap-2 pr-1">
          {tab === 'transactions' && openContractList.length > 0 && (
            <button onClick={downloadTransactionsCsv} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
          {tab === 'journal' && journal.length > 0 && (
            <>
              <button onClick={downloadJournalTxt} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button onClick={onResetStats} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button onClick={onClearJournal} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'summary' && (
          <div className="p-4 space-y-4">
            {/* Highlighted P/L card */}
            <div className={`rounded-xl border p-4 ${isProfit ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-red/10 border-brand-red/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isProfit ? <TrendingUp className="w-4 h-4 text-brand-green" /> : <TrendingDown className="w-4 h-4 text-brand-red" />}
                <span className="text-xs text-text-muted font-medium">Total Profit / Loss</span>
              </div>
              <div className={`text-2xl font-bold tabular ${isProfit ? 'text-brand-green' : 'text-brand-red'}`}>
                {isProfit ? '+' : ''}{runStats.totalProfit.toFixed(2)} {currency}
              </div>
            </div>

            {/* Run stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <SummaryStatCard
                icon={Activity}
                label="No. of Runs"
                value={String(runStats.totalRuns)}
                color="text-text-primary"
              />
              <SummaryStatCard
                icon={Trophy}
                label="Contracts Won"
                value={String(runStats.wins)}
                color="text-brand-green"
              />
              <SummaryStatCard
                icon={TrendingDown}
                label="Contracts Lost"
                value={String(runStats.losses)}
                color="text-brand-red"
              />
              <SummaryStatCard
                icon={Target}
                label="Win Rate"
                value={`${winRate.toFixed(1)}%`}
                color={winRate >= 50 ? 'text-brand-green' : 'text-text-primary'}
              />
              <SummaryStatCard
                icon={Wallet}
                label="Total Stake"
                value={`${runStats.totalStake.toFixed(2)} ${currency}`}
                color="text-text-primary"
              />
              <SummaryStatCard
                icon={DollarSign}
                label="Total Payout"
                value={`${runStats.totalPayout.toFixed(2)} ${currency}`}
                color="text-text-primary"
              />
            </div>

            {/* Reset button */}
            <button
              onClick={onResetStats}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Summary
            </button>
          </div>
        )}

        {tab === 'transactions' && (
          <div className="p-4">
            {openContractList.length === 0 ? (
              <div className="text-center text-sm text-text-muted py-8">No open contracts.</div>
            ) : (
              <div className="space-y-3">
                {openContractList.map((c) => {
                  const profit = c.profit
                  const isPos = profit >= 0
                  return (
                    <div key={c.contract_id} className="rounded-xl bg-bg-tertiary border border-border-light p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                            c.contract_type === 'CALL' ? 'bg-brand-green/15 text-brand-green'
                            : c.contract_type === 'PUT' ? 'bg-brand-red/15 text-brand-red'
                            : 'bg-bg-hover text-text-secondary'
                          }`}>
                            {c.contract_type === 'CALL' ? 'UP' : c.contract_type === 'PUT' ? 'DOWN' : c.contract_type || '—'}
                          </span>
                          <span className="text-sm font-medium truncate" title={c.display_name || c.symbol}>{c.display_name || c.symbol}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${c.is_sold ? 'bg-bg-hover text-text-secondary' : 'bg-brand-blue/15 text-brand-blue'}`}>
                          {c.is_sold ? c.status : 'Open'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-text-muted">Entry spot</span>
                          <span className="tabular font-medium">{c.entry_spot != null ? c.entry_spot.toFixed(c.entry_spot % 1 === 0 ? 0 : 2) : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-muted">Exit spot</span>
                          <span className="tabular font-medium">{c.exit_spot != null ? c.exit_spot.toFixed(c.exit_spot % 1 === 0 ? 0 : 2) : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-muted">Buy price</span>
                          <span className="tabular font-medium">{c.buy_price.toFixed(2)} {currency}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-text-muted">P/L</span>
                          <span className={`tabular font-bold ${isPos ? 'text-brand-green' : 'text-brand-red'}`}>
                            {isPos ? '+' : ''}{profit.toFixed(2)} {currency}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDetailContract(c)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View detail
                        </button>
                      </div>
                    </div>
                  )
                })}
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

      {detailContract && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailContract(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-bg-secondary border border-border-light p-6 slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">Contract details</h2>
              <button onClick={() => setDetailContract(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <DetailRow label="Symbol" value={detailContract.display_name || detailContract.symbol} />
              <DetailRow label="Type" value={detailContract.contract_type || '—'} />
              <DetailRow label="Status" value={detailContract.is_sold ? detailContract.status : 'Open'} />
              <DetailRow label="Buy price" value={`${detailContract.buy_price.toFixed(2)} ${currency}`} />
              <DetailRow label="Payout" value={`${detailContract.payout.toFixed(2)} ${currency}`} />
              <DetailRow label="Entry spot" value={detailContract.entry_spot != null ? String(detailContract.entry_spot) : '—'} />
              <DetailRow label="Exit spot" value={detailContract.exit_spot != null ? String(detailContract.exit_spot) : '—'} />
              <DetailRow label="Current spot" value={detailContract.current_spot ? String(detailContract.current_spot) : '—'} />
              <DetailRow
                label="P/L"
                value={`${detailContract.profit >= 0 ? '+' : ''}${detailContract.profit.toFixed(2)} ${currency}`}
                valueClass={detailContract.profit >= 0 ? 'text-brand-green' : 'text-brand-red'}
              />
              <DetailRow label="Purchase time" value={detailContract.purchase_time ? new Date(detailContract.purchase_time * 1000).toLocaleString() : '—'} />
              <DetailRow label="Sell time" value={detailContract.sell_time ? new Date(detailContract.sell_time * 1000).toLocaleString() : '—'} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function DetailRow({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-text-muted">{label}</span>
      <span className={`font-medium text-right break-all ${valueClass}`}>{value}</span>
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

function SummaryStatCard({ icon: Icon, label, value, color }: { icon: typeof BarChart3; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-bg-tertiary border border-border-light p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <div className={`text-base font-bold tabular ${color}`}>{value}</div>
    </div>
  )
}
