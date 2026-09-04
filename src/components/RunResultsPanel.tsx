import { useState, type RefObject } from 'react'
import {
  ChartBar as BarChart3,
  List,
  ScrollText,
  Trash2,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Wallet,
  Activity,
  DollarSign,
  Download,
  Eye,
  X,
  Clock3,
  CircleDollarSign,
  ArrowUpRight,
} from 'lucide-react'
import type { OpenContract } from '../lib/types'
import type { RunStats, JournalEntry } from '../hooks/useBotRunner'

export type ResultsTab = 'summary' | 'transactions' | 'journal'

const TAB_DEFS: {
  id: ResultsTab
  label: string
  icon: typeof BarChart3
}[] = [
  {
    id: 'summary',
    label: 'Summary',
    icon: BarChart3,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: List,
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: ScrollText,
  },
]

export function RunResultsPanel({
  tab,
  onTabChange,
  runStats,
  journal,
  journalEndRef,
  trades,
  currency,
  onClearJournal,
  onResetStats,
}: {
  tab: ResultsTab
  onTabChange: (tab: ResultsTab) => void
  runStats: RunStats
  journal: JournalEntry[]
  journalEndRef: RefObject<HTMLDivElement | null>
  trades: OpenContract[]
  currency: string
  onClearJournal: () => void
  onResetStats: () => void
}) {
  const winRate =
    runStats.wins + runStats.losses > 0
      ? (runStats.wins / (runStats.wins + runStats.losses)) * 100
      : 0

  const isProfit = runStats.totalProfit >= 0

  const [detailContract, setDetailContract] =
    useState<OpenContract | null>(null)

  const downloadTransactionsCsv = () => {
    const headers = [
      'Symbol',
      'Type',
      'Entry Spot',
      'Exit Spot',
      'Buy Price',
      'P/L',
      'Status',
    ]

    const rows = trades.map((contract) => [
      contract.display_name || contract.symbol,
      contract.contract_type || '—',
      contract.entry_spot != null
        ? String(contract.entry_spot)
        : '—',
      contract.exit_spot != null
        ? String(contract.exit_spot)
        : '—',
      contract.buy_price.toFixed(2),
      contract.profit.toFixed(2),
      contract.is_sold
        ? contract.status
        : 'Open',
    ])

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(/"/g, '""')}"`,
          )
          .join(','),
      )
      .join('\n')

    triggerDownload(
      csv,
      `transactions-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
    )
  }

  const downloadJournalTxt = () => {
    const text = journal
      .map(
        (entry) =>
          `[${entry.time.toLocaleString()}] ${entry.type.toUpperCase()} — ${entry.message}`,
      )
      .join('\n')

    triggerDownload(
      text,
      `journal-${new Date()
        .toISOString()
        .slice(0, 10)}.txt`,
    )
  }

  return (
    <div className="bg-bg-secondary flex flex-col h-full min-h-0">
      {/* ======================================================
          TABS
      ======================================================= */}

      <div className="hidden sm:flex items-center gap-1 px-3 pt-2 border-b border-border-default shrink-0">
        {TAB_DEFS.map(
          ({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`relative flex items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                tab === id
                  ? 'text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />

              {label}

              {tab === id && (
                <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-brand-green" />
              )}
            </button>
          ),
        )}

        <div className="ml-auto flex items-center gap-1 pr-1">
          {tab === 'transactions' &&
            trades.length > 0 && (
              <button
                onClick={downloadTransactionsCsv}
                title="Download transactions"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

          {tab === 'journal' &&
            journal.length > 0 && (
              <button
                onClick={downloadJournalTxt}
                title="Download journal"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
        </div>
      </div>

      {/* Mobile tab selector — segmented control, always visible */}
      <div className="sm:hidden px-3 pt-2.5 pb-2 border-b border-border-default shrink-0">
        <div className="flex items-center gap-1 rounded-xl bg-bg-tertiary border border-border-light p-1">
          {TAB_DEFS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === id
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2">
          {tab === 'transactions' &&
            trades.length > 0 && (
              <button
                onClick={downloadTransactionsCsv}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-text-secondary bg-bg-tertiary border border-border-light hover:text-text-primary transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </button>
            )}

          {tab === 'journal' &&
            journal.length > 0 && (
              <button
                onClick={downloadJournalTxt}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-text-secondary bg-bg-tertiary border border-border-light hover:text-text-primary transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            )}
        </div>
      </div>

      {/* ======================================================
          CONTENT
      ======================================================= */}

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* ====================================================
            SUMMARY
        ===================================================== */}

        {tab === 'summary' && (
          <div className="p-4 space-y-4">
            {/* P/L hero */}
            <div
              className={`relative overflow-hidden rounded-2xl border p-5 ${
                isProfit
                  ? 'bg-brand-green/10 border-brand-green/25'
                  : 'bg-brand-red/10 border-brand-red/25'
              }`}
            >
              <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-current opacity-[0.035]" />

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isProfit
                          ? 'bg-brand-green/15'
                          : 'bg-brand-red/15'
                      }`}
                    >
                      {isProfit ? (
                        <TrendingUp className="w-4 h-4 text-brand-green" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-brand-red" />
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-text-muted">
                        Total P/L
                      </div>

                      <div className="text-[10px] text-text-muted mt-0.5">
                        Across all bot runs
                      </div>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg ${
                    isProfit
                      ? 'bg-brand-green/15 text-brand-green'
                      : 'bg-brand-red/15 text-brand-red'
                  }`}
                >
                  {isProfit ? 'Profit' : 'Loss'}
                </span>
              </div>

              <div
                className={`mt-5 text-3xl font-bold tracking-tight tabular ${
                  isProfit
                    ? 'text-brand-green'
                    : 'text-brand-red'
                }`}
              >
                {isProfit ? '+' : ''}
                {runStats.totalProfit.toFixed(2)}
                <span className="text-sm ml-1.5 font-semibold">
                  {currency}
                </span>
              </div>
            </div>

            {/* Main metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              <SummaryStatCard
                icon={Activity}
                label="Runs"
                value={String(runStats.totalRuns)}
              />

              <SummaryStatCard
                icon={Target}
                label="Win rate"
                value={`${winRate.toFixed(1)}%`}
                valueClass={
                  winRate >= 50
                    ? 'text-brand-green'
                    : 'text-text-primary'
                }
              />

              <SummaryStatCard
                icon={Trophy}
                label="Won"
                value={String(runStats.wins)}
                valueClass="text-brand-green"
              />

              <SummaryStatCard
                icon={TrendingDown}
                label="Lost"
                value={String(runStats.losses)}
                valueClass="text-brand-red"
              />
            </div>

            {/* Financial metrics */}
            <div className="rounded-2xl border border-border-light bg-bg-tertiary overflow-hidden">
              <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-text-muted" />

                  <span className="text-xs font-bold text-text-primary">
                    Financial overview
                  </span>
                </div>

                <span className="text-[10px] text-text-muted uppercase tracking-wider">
                  {currency}
                </span>
              </div>

              <div className="grid grid-cols-2 divide-x divide-border-default">
                <MetricBlock
                  label="Total stake"
                  value={`${runStats.totalStake.toFixed(2)} ${currency}`}
                  icon={Wallet}
                />

                <MetricBlock
                  label="Total payout"
                  value={`${runStats.totalPayout.toFixed(2)} ${currency}`}
                  icon={DollarSign}
                />
              </div>
            </div>

            {/* Win rate bar */}
            <div className="rounded-2xl border border-border-light bg-bg-tertiary p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-text-primary">
                  Win / loss performance
                </span>

                <span className="text-xs font-bold tabular text-text-secondary">
                  {runStats.wins} / {runStats.losses}
                </span>
              </div>

              <div className="h-2 rounded-full bg-bg-hover overflow-hidden flex">
                {runStats.totalRuns > 0 && (
                  <>
                    <div
                      className="h-full bg-brand-green transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          winRate,
                        )}%`,
                      }}
                    />

                    <div
                      className="h-full bg-brand-red transition-all"
                      style={{
                        width: `${Math.max(
                          0,
                          100 - winRate,
                        )}%`,
                      }}
                    />
                  </>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 text-[10px] text-text-muted">
                <span>
                  {winRate.toFixed(1)}% won
                </span>

                <span>
                  {(100 - winRate).toFixed(1)}% lost
                </span>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={onResetStats}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-bg-tertiary border border-border-light text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset statistics
            </button>
          </div>
        )}

        {/* ====================================================
            TRANSACTIONS
        ===================================================== */}

        {tab === 'transactions' && (
          <div className="p-4">
            {trades.length === 0 ? (
              <EmptyState
                icon={List}
                title="No transactions yet"
                description="Run your bot to see contracts and trade results here."
              />
            ) : (
              <div className="space-y-2.5">
                {trades.map((contract) => {
                  const profit = contract.profit
                  const isPositive = profit >= 0

                  const direction =
                    contract.contract_type === 'CALL'
                      ? 'UP'
                      : contract.contract_type ===
                          'PUT'
                        ? 'DOWN'
                        : contract.contract_type ||
                          '—'

                  return (
                    <div
                      key={contract.contract_id}
                      className="group rounded-2xl bg-bg-tertiary border border-border-light overflow-hidden hover:border-border-default transition-colors"
                    >
                      {/* Header */}
                      <div className="px-3.5 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              direction === 'UP'
                                ? 'bg-brand-green/10'
                                : direction === 'DOWN'
                                  ? 'bg-brand-red/10'
                                  : 'bg-bg-hover'
                            }`}
                          >
                            {direction === 'UP' ? (
                              <TrendingUp className="w-4 h-4 text-brand-green" />
                            ) : direction ===
                              'DOWN' ? (
                              <TrendingDown className="w-4 h-4 text-brand-red" />
                            ) : (
                              <Activity className="w-4 h-4 text-text-muted" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-text-primary truncate">
                                {contract.display_name ||
                                  contract.symbol}
                              </span>

                              <span
                                className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                                  direction === 'UP'
                                    ? 'bg-brand-green/10 text-brand-green'
                                    : direction ===
                                        'DOWN'
                                      ? 'bg-brand-red/10 text-brand-red'
                                      : 'bg-bg-hover text-text-secondary'
                                }`}
                              >
                                {direction}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-text-muted">
                              <Clock3 className="w-3 h-3" />

                              {contract.is_sold
                                ? contract.status
                                : 'Open'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`text-sm font-bold tabular ${
                              isPositive
                                ? 'text-brand-green'
                                : 'text-brand-red'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {profit.toFixed(2)}
                          </div>

                          <div className="text-[10px] text-text-muted">
                            {currency}
                          </div>
                        </div>
                      </div>

                      {/* Detail grid */}
                      <div className="px-3.5 pb-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-border-default">
                          <CompactDetail
                            label="Type"
                            value={
                              contract.contract_type ||
                              '—'
                            }
                          />

                          <CompactDetail
                            label="Buy price"
                            value={`${contract.buy_price.toFixed(2)} ${currency}`}
                          />

                          <CompactDetail
                            label="Entry"
                            value={
                              contract.entry_spot != null
                                ? contract.entry_spot.toFixed(
                                    contract.entry_spot %
                                      1 ===
                                      0
                                      ? 0
                                      : 2,
                                  )
                                : '—'
                            }
                          />

                          <CompactDetail
                            label="Exit"
                            value={
                              contract.exit_spot != null
                                ? contract.exit_spot.toFixed(
                                    contract.exit_spot %
                                      1 ===
                                      0
                                      ? 0
                                      : 2,
                                  )
                                : '—'
                            }
                          />
                        </div>

                        <button
                          onClick={() =>
                            setDetailContract(
                              contract,
                            )
                          }
                          className="w-full mt-3 h-9 rounded-lg bg-bg-hover text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-secondary flex items-center justify-center gap-2 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View contract details
                          <ArrowUpRight className="w-3 h-3 opacity-50" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ====================================================
            JOURNAL
        ===================================================== */}

        {tab === 'journal' && (
          <div className="p-3">
            {journal.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="Journal is empty"
                description="Bot activity and execution messages will appear here."
              />
            ) : (
              <>
                <div className="space-y-1">
                  {journal.map((entry, index) => {
                    const dotClass =
                      entry.type === 'success'
                        ? 'bg-brand-green'
                        : entry.type === 'error'
                          ? 'bg-brand-red'
                          : entry.type === 'warn'
                            ? 'bg-brand-amber'
                            : 'bg-brand-blue'

                    return (
                      <div
                        key={index}
                        className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 hover:bg-bg-tertiary transition-colors"
                      >
                        <span
                          className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`}
                        />

                        <span className="text-[10px] text-text-muted tabular shrink-0 pt-0.5">
                          {entry.time.toLocaleTimeString()}
                        </span>

                        <span className="text-xs leading-relaxed text-text-secondary min-w-0">
                          {entry.message}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-2 pt-3 mt-2 border-t border-border-default">
                  <button
                    onClick={onResetStats}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>

                  <button
                    onClick={onClearJournal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                </div>

                <div ref={journalEndRef} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ======================================================
          CONTRACT DETAILS MODAL
      ======================================================= */}

      {detailContract && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailContract(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-bg-secondary border border-border-light shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="sticky top-0 bg-bg-secondary/95 backdrop-blur-sm px-5 py-4 border-b border-border-default flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-text-muted font-bold">
                  Contract
                </div>

                <h2 className="font-bold text-lg text-text-primary mt-0.5">
                  Contract details
                </h2>
              </div>

              <button
                onClick={() =>
                  setDetailContract(null)
                }
                className="w-9 h-9 rounded-xl bg-bg-tertiary border border-border-light flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div
                className={`rounded-2xl p-4 border ${
                  detailContract.profit >= 0
                    ? 'bg-brand-green/10 border-brand-green/20'
                    : 'bg-brand-red/10 border-brand-red/20'
                }`}
              >
                <div className="text-xs text-text-muted">
                  Contract P/L
                </div>

                <div
                  className={`text-2xl font-bold tabular mt-1 ${
                    detailContract.profit >= 0
                      ? 'text-brand-green'
                      : 'text-brand-red'
                  }`}
                >
                  {detailContract.profit >= 0
                    ? '+'
                    : ''}
                  {detailContract.profit.toFixed(2)}{' '}
                  {currency}
                </div>
              </div>

              <div className="rounded-2xl bg-bg-tertiary border border-border-light p-4 space-y-3">
                <DetailRow
                  label="Symbol"
                  value={
                    detailContract.display_name ||
                    detailContract.symbol
                  }
                />

                <DetailRow
                  label="Type"
                  value={
                    detailContract.contract_type ||
                    '—'
                  }
                />

                <DetailRow
                  label="Status"
                  value={
                    detailContract.is_sold
                      ? detailContract.status
                      : 'Open'
                  }
                />

                <DetailRow
                  label="Buy price"
                  value={`${detailContract.buy_price.toFixed(2)} ${currency}`}
                />

                <DetailRow
                  label="Payout"
                  value={`${detailContract.payout.toFixed(2)} ${currency}`}
                />

                <DetailRow
                  label="Entry spot"
                  value={
                    detailContract.entry_spot != null
                      ? String(
                          detailContract.entry_spot,
                        )
                      : '—'
                  }
                />

                <DetailRow
                  label="Exit spot"
                  value={
                    detailContract.exit_spot != null
                      ? String(
                          detailContract.exit_spot,
                        )
                      : '—'
                  }
                />

                <DetailRow
                  label="Current spot"
                  value={
                    detailContract.current_spot
                      ? String(
                          detailContract.current_spot,
                        )
                      : '—'
                  }
                />

                <DetailRow
                  label="P/L"
                  value={`${detailContract.profit >= 0 ? '+' : ''}${detailContract.profit.toFixed(2)} ${currency}`}
                  valueClass={
                    detailContract.profit >= 0
                      ? 'text-brand-green'
                      : 'text-brand-red'
                  }
                />

                <DetailRow
                  label="Purchase time"
                  value={
                    detailContract.purchase_time
                      ? new Date(
                          detailContract.purchase_time *
                            1000,
                        ).toLocaleString()
                      : '—'
                  }
                />

                <DetailRow
                  label="Sell time"
                  value={
                    detailContract.sell_time
                      ? new Date(
                          detailContract.sell_time *
                            1000,
                        ).toLocaleString()
                      : '—'
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   HELPERS
============================================================ */

function triggerDownload(
  content: string,
  filename: string,
) {
  const blob = new Blob([content], {
    type: 'text/plain;charset=utf-8',
  })

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(url)
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BarChart3
  title: string
  description: string
}) {
  return (
    <div className="min-h-[260px] flex flex-col items-center justify-center text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-bg-tertiary border border-border-light flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-text-muted" />
      </div>

      <div className="text-sm font-bold text-text-primary">
        {title}
      </div>

      <div className="text-xs text-text-muted leading-relaxed mt-1.5 max-w-[240px]">
        {description}
      </div>
    </div>
  )
}

function SummaryStatCard({
  icon: Icon,
  label,
  value,
  valueClass = 'text-text-primary',
}: {
  icon: typeof BarChart3
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-2xl bg-bg-tertiary border border-border-light p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-text-muted" />

        <span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
          {label}
        </span>
      </div>

      <div
        className={`text-lg font-bold tabular ${valueClass}`}
      >
        {value}
      </div>
    </div>
  )
}

function MetricBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Wallet
}) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-text-muted" />

        <span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
          {label}
        </span>
      </div>

      <div className="text-sm font-bold tabular text-text-primary">
        {value}
      </div>
    </div>
  )
}

function CompactDetail({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <span className="text-[10px] text-text-muted shrink-0">
        {label}
      </span>

      <span className="text-[10px] font-semibold text-text-secondary tabular truncate">
        {value}
      </span>
    </div>
  )
}

function DetailRow({
  label,
  value,
  valueClass = '',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <span className="text-xs text-text-muted shrink-0">
        {label}
      </span>

      <span
        className={`text-xs font-semibold text-right break-all ${valueClass}`}
      >
        {value}
      </span>
    </div>
  )
}