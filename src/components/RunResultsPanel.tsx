import { useState, type ReactNode, type RefObject } from 'react'
import { ChartBar as BarChart3, List, ScrollText, Trash2, RotateCcw, TrendingUp, TrendingDown, Download, X, Circle, Pause, Activity, CircleCheck as CheckCircle2, Loader as Loader2, Bot as BotIcon } from 'lucide-react'
import { resolveDisplayName, type OpenContract } from '../lib/types'
import type { RunStats, JournalEntry } from '../context/BotRunnerContext'

export type ResultsTab = 'summary' | 'transactions' | 'journal'

const TAB_DEFS: Array<{ id: ResultsTab; label: string; icon: typeof BarChart3 }> = [
  { id: 'summary', label: 'Summary', icon: BarChart3 },
  { id: 'transactions', label: 'Transactions', icon: List },
  { id: 'journal', label: 'Journal', icon: ScrollText },
]

type Phase = 'waiting' | 'purchasing' | 'open' | 'settled'

function derivePhase(hasPurchased: boolean, hasOpenContract: boolean, latest?: OpenContract): Phase {
  if (latest && latest.is_sold) return 'settled'
  if (hasOpenContract) return 'open'
  if (hasPurchased) return 'purchasing'
  return 'waiting'
}

const PHASE_CONFIG: Record<Phase, { label: string; icon: typeof Activity; color: string; dotColor: string }> = {
  waiting: { label: 'Waiting for a signal to buy a contract', icon: Activity, color: 'text-text-secondary', dotColor: 'bg-text-muted' },
  purchasing: { label: 'Buying contract…', icon: Loader2, color: 'text-brand-blue', dotColor: 'bg-brand-blue' },
  open: { label: 'Contract bought — waiting for result', icon: Circle, color: 'text-brand-amber', dotColor: 'bg-brand-amber' },
  settled: { label: 'Contract settled', icon: CheckCircle2, color: 'text-brand-green', dotColor: 'bg-brand-green' },
}

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
  isRunning,
  onStop,
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
  isRunning: boolean
  onStop: () => void
}) {
  const [detailContract, setDetailContract] = useState<OpenContract | null>(null)

  const hasPurchased = trades.length > 0 || journal.some((entry) => entry.message.startsWith('Contract purchased:'))
  const hasOpenContract = trades.some((t) => !t.is_sold)
  const latest = trades[0]
  const phase = derivePhase(hasPurchased, hasOpenContract, latest)
  const winRate = runStats.wins + runStats.losses > 0 ? (runStats.wins / (runStats.wins + runStats.losses)) * 100 : 0

  // Derive the most recent actionable status from journal + phase
  const lastJournal = journal[journal.length - 1]
  let statusLabel: string
  let StatusIcon = Activity
  let statusColor = 'text-text-secondary'
  let statusDotColor = 'bg-text-muted'

  if (!isRunning) {
    statusLabel = 'Bot is not running'
    statusColor = 'text-text-muted'
    statusDotColor = 'bg-text-muted'
  } else {
    const config = PHASE_CONFIG[phase]
    statusLabel = config.label
    StatusIcon = config.icon
    statusColor = config.color
    statusDotColor = config.dotColor

    if (lastJournal) {
      if (lastJournal.message.startsWith('Contract settled:')) {
        const profitMatch = lastJournal.message.match(/\(([-\d.]+)\)/)
        const profit = profitMatch ? parseFloat(profitMatch[1]) : 0
        if (profit > 0) {
          statusLabel = 'Contract won'
          StatusIcon = TrendingUp
          statusColor = 'text-brand-green'
          statusDotColor = 'bg-brand-green'
        } else if (profit < 0) {
          statusLabel = 'Contract lost'
          StatusIcon = TrendingDown
          statusColor = 'text-brand-red'
          statusDotColor = 'bg-brand-red'
        } else {
          statusLabel = 'Contract sold'
          statusColor = 'text-text-secondary'
          statusDotColor = 'bg-text-muted'
        }
      } else if (lastJournal.message.startsWith('Contract purchased:')) {
        statusLabel = 'Contract bought — waiting for result'
        StatusIcon = Circle
        statusColor = 'text-brand-amber'
        statusDotColor = 'bg-brand-amber'
      } else if (lastJournal.message.startsWith('Requesting proposal')) {
        statusLabel = 'Buying contract…'
        StatusIcon = Loader2
        statusColor = 'text-brand-blue'
        statusDotColor = 'bg-brand-blue'
      } else if (lastJournal.message.startsWith('Bot started')) {
        statusLabel = 'Bot is starting…'
        StatusIcon = BotIcon
        statusColor = 'text-brand-red'
        statusDotColor = 'bg-brand-red'
      }
    }
  }

  const downloadTransactionsCsv = () => {
    const rows = trades.map((contract) => [
      resolveDisplayName(contract.display_name, contract.symbol),
      contract.contract_type || '—',
      contract.entry_spot == null ? '—' : String(contract.entry_spot),
      contract.exit_spot == null ? '—' : String(contract.exit_spot),
      contract.buy_price.toFixed(2),
      contract.profit.toFixed(2),
      contract.is_sold ? contract.status : 'Open',
    ])
    const csv = [['Symbol', 'Type', 'Entry Spot', 'Exit Spot', 'Buy Price', 'P/L', 'Status'], ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    triggerDownload(csv, `transactions-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const downloadJournalTxt = () => {
    const text = [...journal].reverse().map((entry) => `${entry.message}\n${entry.time.toLocaleString()}`).join('\n\n')
    triggerDownload(text, `journal-${new Date().toISOString().slice(0, 10)}.txt`)
  }

  return (
    <div className="bg-bg-secondary flex flex-col h-full min-h-0 relative">
      {isRunning && (
        <div className="flex items-stretch gap-0 px-2 sm:px-4 py-2 sm:py-3 border-b border-border-default shrink-0">
          <button type="button" onClick={onStop} className="h-10 sm:h-12 px-4 sm:px-6 rounded-l-xl bg-brand-red text-white flex items-center gap-2 font-bold text-sm sm:text-base hover:bg-brand-red-dim transition-colors shrink-0">
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span>Stop</span>
          </button>
          <div className="flex-1 min-w-0 h-10 sm:h-12 rounded-r-xl border border-border-light border-l-0 bg-bg-primary px-3 sm:px-4 flex items-center gap-2.5">
            <span className="relative flex w-2 h-2 shrink-0">
              <span className={`absolute inline-flex w-full h-full rounded-full ${statusDotColor} opacity-60 animate-ping`} />
              <span className={`relative w-2 h-2 rounded-full ${statusDotColor}`} />
            </span>
            <div className="min-w-0 flex-1">
              <span className={`font-bold text-xs sm:text-sm truncate block ${statusColor}`}>{statusLabel}</span>
              {latest && (
                <span className="text-[10px] text-text-muted truncate block mt-0.5">
                  {resolveDisplayName(latest.display_name, latest.symbol)} · {contractTypeLabel(latest.contract_type)}
                </span>
              )}
            </div>
            {StatusIcon === Loader2 ? (
              <StatusIcon className="w-4 h-4 shrink-0 animate-spin text-text-muted" />
            ) : (
              <StatusIcon className={`w-4 h-4 shrink-0 ${statusColor}`} />
            )}
          </div>
        </div>
      )}

      <div className="flex items-center border-b border-border-default shrink-0 px-2 sm:px-3">
        <div className="flex items-center flex-1">
          {TAB_DEFS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => onTabChange(id)} className={`relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base transition-colors ${tab === id ? 'font-bold text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
              <Icon className="w-4 h-4 sm:hidden" />
              {label}
              {tab === id && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-red" />}
            </button>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-1">
          {tab === 'transactions' && trades.length > 0 && <IconButton label="Download transactions" onClick={downloadTransactionsCsv}><Download /></IconButton>}
          {tab === 'journal' && journal.length > 0 && <IconButton label="Download journal" onClick={downloadJournalTxt}><Download /></IconButton>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'summary' && <SummaryView runStats={runStats} winRate={winRate} currency={currency} latest={latest} phase={phase} isRunning={isRunning} onReset={onResetStats} />}
        {tab === 'transactions' && <TransactionsView trades={trades} currency={currency} onDetails={setDetailContract} onReset={onResetStats} onDownload={downloadTransactionsCsv} />}
        {tab === 'journal' && <JournalView journal={journal} journalEndRef={journalEndRef} onReset={onResetStats} onClear={onClearJournal} onDownload={downloadJournalTxt} />}
      </div>

      {detailContract && <ContractDetails contract={detailContract} currency={currency} onClose={() => setDetailContract(null)} />}
    </div>
  )
}

function contractTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CALL: 'Rise', PUT: 'Fall', HIGHER: 'Higher', LOWER: 'Lower',
    ONETOUCH: 'Touch', NOTOUCH: 'No Touch', DIGITMATCH: 'Matches',
    DIGITDIFF: 'Differs', DIGITEVEN: 'Even', DIGITODD: 'Odd',
    DIGITOVER: 'Over', DIGITUNDER: 'Under', MULTUP: 'Multiplier Up',
    MULTDOWN: 'Multiplier Down', ACCU: 'Accumulator',
  }
  return map[type?.toUpperCase()] || type || '—'
}

function SummaryView({ runStats, winRate, currency, latest, phase, isRunning, onReset }: { runStats: RunStats; winRate: number; currency: string; latest?: OpenContract; phase: Phase; isRunning: boolean; onReset: () => void }) {
  const profit = latest?.profit ?? runStats.totalProfit
  const buyPrice = latest?.buy_price ?? runStats.totalStake
  const payout = latest?.payout ?? runStats.totalPayout
  const isSettled = phase === 'settled' && latest?.is_sold
  const isWin = isSettled && profit > 0
  const isLoss = isSettled && profit < 0
  const displayName = latest ? resolveDisplayName(latest.display_name, latest.symbol) : ''

  if (!isRunning && !latest && runStats.totalRuns === 0) {
    return (
      <div className="p-3 sm:p-5">
        <div className="rounded-xl border border-border-light bg-bg-primary/40 p-5 sm:p-8 flex flex-col items-center justify-center text-center min-h-[240px]">
          <div className="w-11 h-11 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mb-4">
            <Activity className="w-5 h-5 text-brand-red" />
          </div>
          <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
            When you&rsquo;re ready to trade, hit Run. You&rsquo;ll be able to track your bot&rsquo;s performance here.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5 bg-bg-tertiary/60 px-3 sm:px-5 py-4 sm:py-5 mt-3 rounded-xl">
          <BottomStat label="Total stake" value={`${runStats.totalStake.toFixed(2)} ${currency}`} />
          <BottomStat label="Total payout" value={`${runStats.totalPayout.toFixed(2)} ${currency}`} />
          <BottomStat label="No. of runs" value={String(runStats.totalRuns)} />
          <BottomStat label="Contracts lost" value={String(runStats.losses)} />
          <BottomStat label="Contracts won" value={String(runStats.wins)} />
          <BottomStat label="Profit/loss" value={`${runStats.totalProfit >= 0 ? '+' : ''}${runStats.totalProfit.toFixed(2)} ${currency}`} valueClass={runStats.totalProfit >= 0 ? 'text-[#4eb5b7]' : 'text-brand-red'} />
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted mt-3">
          <span>Win rate: <strong className="text-text-secondary">{winRate.toFixed(1)}%</strong></span>
          <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-light hover:text-text-primary transition-colors"><RotateCcw className="w-3 h-3" /> Reset</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-5 space-y-3">
      <div className={`rounded-xl border p-4 sm:p-5 relative overflow-hidden transition-colors ${
        isSettled
          ? isWin
            ? 'border-brand-green/30 bg-brand-green/[0.06]'
            : isLoss
              ? 'border-brand-red/30 bg-brand-red/[0.06]'
              : 'border-border-light bg-bg-primary/40'
          : 'border-border-light bg-bg-primary/40'
      }`}>
        {isSettled && latest && (
          <div className={`absolute top-0 left-0 right-0 px-3 py-1.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold ${
            isWin ? 'bg-brand-green/15 text-brand-green' : isLoss ? 'bg-brand-red/15 text-brand-red' : 'bg-bg-tertiary/60 text-text-secondary'
          }`}>
            {isWin ? <TrendingUp className="w-3.5 h-3.5" /> : isLoss ? <TrendingDown className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
            Closed — {profit >= 0 ? '+' : ''}{profit.toFixed(2)} {currency}
          </div>
        )}

        <div className={isSettled ? 'pt-8' : ''}>
          {latest && (
            <div className="flex items-center flex-wrap gap-2 mb-4">
              <span className="text-sm font-bold text-text-primary">{displayName}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-red/15 text-brand-red">{contractTypeLabel(latest.contract_type)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary">{currency}</span>
            </div>
          )}

          <div className="inline-flex rounded-lg bg-[#82adaf] px-2 py-1 text-xs font-bold text-white mb-4">{currency}</div>

          <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5">
            <Quote label="Total profit/loss" value={`${profit >= 0 ? '+' : ''}${profit.toFixed(2)}`} valueClass={profit >= 0 ? 'text-[#4eb5b7]' : 'text-brand-red'} />
            <Quote label="Contract value" value={buyPrice.toFixed(2)} />
            <Quote label="Stake" value={buyPrice.toFixed(2)} />
            <Quote label="Potential payout" value={payout.toFixed(2)} />
          </div>

          <div className="mt-5 pt-4 border-t border-border-default text-center text-sm text-text-secondary">
            {phase === 'open' && latest ? 'Resale not offered' : phase === 'settled' ? 'Contract closed' : 'No active contract'}
            {phase === 'settled' && latest && (
              <div className="mt-1.5 text-xs text-text-muted">
                {displayName}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5 bg-bg-tertiary/60 px-3 sm:px-5 py-4 sm:py-5 rounded-xl">
        <BottomStat label="Total stake" value={`${runStats.totalStake.toFixed(2)} ${currency}`} />
        <BottomStat label="Total payout" value={`${runStats.totalPayout.toFixed(2)} ${currency}`} />
        <BottomStat label="No. of runs" value={String(runStats.totalRuns)} />
        <BottomStat label="Contracts lost" value={String(runStats.losses)} />
        <BottomStat label="Contracts won" value={String(runStats.wins)} />
        <BottomStat label="Profit/loss" value={`${runStats.totalProfit >= 0 ? '+' : ''}${runStats.totalProfit.toFixed(2)} ${currency}`} valueClass={runStats.totalProfit >= 0 ? 'text-[#4eb5b7]' : 'text-brand-red'} />
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Win rate: <strong className="text-text-secondary">{winRate.toFixed(1)}%</strong></span>
        <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-light hover:text-text-primary transition-colors"><RotateCcw className="w-3 h-3" /> Reset</button>
      </div>
    </div>
  )
}

function TransactionsView({ trades, currency, onDetails, onReset, onDownload }: { trades: OpenContract[]; currency: string; onDetails: (contract: OpenContract) => void; onReset: () => void; onDownload: () => void }) {
  if (trades.length === 0) return <EmptyState icon={List} title="No transactions yet" description="Run your bot to see contracts and trade results here." />

  return (
    <div>
      <div className="grid grid-cols-[0.8fr_1.2fr_1fr] gap-3 px-4 sm:px-7 py-3.5 border-b border-border-default text-xs sm:text-sm font-bold text-text-primary">
        <span>Type</span><span>Entry/Exit spot</span><span className="text-right">Buy price and P/L</span>
      </div>
      {trades.map((contract) => {
        const isUp = ['CALL', 'CALLE', 'HIGHER', 'ONETOUCH'].includes(contract.contract_type)
        const isPositive = contract.profit >= 0
        const entrySpot = formatSpot(contract.entry_spot)
        const exitSpot = formatSpot(contract.exit_spot)
        return (
          <button key={contract.contract_id} onClick={() => onDetails(contract)} className="w-full grid grid-cols-[0.8fr_1.2fr_1fr] gap-3 items-center px-4 sm:px-7 py-3.5 border-b border-border-default text-left hover:bg-bg-tertiary transition-colors">
            <span className="flex items-center gap-2 text-xs font-semibold text-text-secondary min-w-0">
              {isUp ? <TrendingUp className="w-5 h-5 text-brand-green shrink-0" /> : <TrendingDown className="w-5 h-5 text-brand-red shrink-0" />}
              <span className="hidden sm:inline truncate">{contract.contract_type || 'Trade'}</span>
            </span>
            <span className="text-xs sm:text-sm tabular text-text-primary space-y-1">
              <span className="flex items-center gap-2">
                <Circle className="w-3.5 h-3.5 text-brand-red fill-brand-red/10 shrink-0" />
                <span>{entrySpot}</span>
              </span>
              <span className="flex items-center gap-2">
                <Circle className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span>{exitSpot}</span>
              </span>
            </span>
            <span className="text-right text-xs sm:text-sm tabular">
              <span className="block text-text-primary">{contract.buy_price.toFixed(2)} {currency}</span>
              <span className={isPositive ? 'text-[#4eb5b7]' : 'text-brand-red'}>{isPositive ? '+' : ''}{contract.profit.toFixed(2)} {currency}</span>
            </span>
          </button>
        )
      })}
      <div className="grid grid-cols-3 gap-3 bg-bg-tertiary/70 px-4 sm:px-7 py-5 text-center">
        <BottomStat label="Total stake" value={`${trades.reduce((sum, item) => sum + item.buy_price, 0).toFixed(2)} ${currency}`} />
        <BottomStat label="Total payout" value={`${trades.reduce((sum, item) => sum + item.payout, 0).toFixed(2)} ${currency}`} />
        <BottomStat label="No. of runs" value={String(trades.length)} />
      </div>
      <div className="flex gap-2 px-4 sm:px-7 py-3"><button onClick={onReset} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"><RotateCcw className="w-3 h-3" /> Reset</button><button onClick={onDownload} className="ml-auto flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"><Download className="w-3 h-3" /> Download</button></div>
    </div>
  )
}

function JournalView({ journal, journalEndRef, onReset, onClear, onDownload }: { journal: JournalEntry[]; journalEndRef: RefObject<HTMLDivElement | null>; onReset: () => void; onClear: () => void; onDownload: () => void }) {
  return <div className="p-3 sm:p-5">{journal.length === 0 ? <EmptyState icon={ScrollText} title="Journal is empty" description="Bot activity and execution messages will appear here." /> : <><div className="space-y-1">{journal.map((entry, index) => <JournalRow key={index} entry={entry} />)}</div><div className="flex items-center gap-3 mt-4 pt-3 border-t border-border-default"><button onClick={onReset} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"><RotateCcw className="w-3 h-3" /> Reset</button><button onClick={onClear} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"><Trash2 className="w-3 h-3" /> Clear</button><button onClick={onDownload} className="ml-auto flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"><Download className="w-3 h-3" /> Download</button></div><div ref={journalEndRef} /></>}</div>
}

function JournalRow({ entry }: { entry: JournalEntry }) {
  const color = entry.type === 'success' ? 'bg-brand-green' : entry.type === 'error' ? 'bg-brand-red' : entry.type === 'warn' ? 'bg-brand-amber' : 'bg-brand-blue'
  const match = entry.message.match(/Contract settled:.*?\(([-\d.]+)\)/)
  const amount = match ? parseFloat(match[1]) : 0
  const message = match ? `${amount > 0 ? 'Profit' : amount < 0 ? 'Loss' : 'Sold'}: ${amount > 0 ? '+' : ''}${amount.toFixed(2)}` : entry.message.startsWith('Contract purchased:') ? 'Contract bought' : entry.message.startsWith('Requesting proposal') ? 'Waiting for a signal to buy a contract' : entry.message
  return <div className="rounded-xl px-3 py-2.5 hover:bg-bg-tertiary"><div className="flex items-center gap-2 mb-1"><span className={`w-1.5 h-1.5 rounded-full ${color}`} /><span className="text-[10px] text-text-muted">{entry.time.toLocaleString()}</span></div><div className={`pl-3.5 text-xs ${match ? amount >= 0 ? 'text-[#4eb5b7] font-semibold' : 'text-brand-red font-semibold' : 'text-text-secondary'}`}>{message}</div></div>
}

function ContractDetails({ contract, currency, onClose }: { contract: OpenContract; currency: string; onClose: () => void }) {
  const displayName = resolveDisplayName(contract.display_name, contract.symbol)
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-bg-secondary border border-border-light shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Contract</div>
            <h2 className="font-bold text-lg">Contract details</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-bg-tertiary flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className={`rounded-2xl p-4 border ${contract.profit >= 0 ? 'bg-brand-green/10 border-brand-green/20' : 'bg-brand-red/10 border-brand-red/20'}`}>
            <div className="text-xs text-text-muted">Contract P/L</div>
            <div className={`text-2xl font-bold tabular mt-1 ${contract.profit >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>{contract.profit >= 0 ? '+' : ''}{contract.profit.toFixed(2)} {currency}</div>
          </div>
          <div className="rounded-2xl bg-bg-tertiary border border-border-light p-4 space-y-3">
            <DetailRow label="Symbol" value={displayName} />
            <DetailRow label="Type" value={contract.contract_type || '—'} />
            <DetailRow label="Status" value={contract.is_sold ? contract.status : 'Open'} />
            <DetailRow label="Buy price" value={`${contract.buy_price.toFixed(2)} ${currency}`} />
            <DetailRow label="Payout" value={`${contract.payout.toFixed(2)} ${currency}`} />
            <DetailRow label="Entry spot" value={formatSpot(contract.entry_spot)} />
            <DetailRow label="Exit spot" value={formatSpot(contract.exit_spot)} />
            <DetailRow label="Purchase time" value={contract.purchase_time ? new Date(contract.purchase_time * 1000).toLocaleString() : '—'} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Quote({ label, value, valueClass = 'text-text-primary' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <div className="text-xs sm:text-sm text-text-secondary mb-1">{label}:</div>
      <div className={`text-lg sm:text-xl font-bold tabular ${valueClass}`}>{value}</div>
    </div>
  )
}

function BottomStat({ label, value, valueClass = 'text-text-primary' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <div className="text-xs sm:text-sm font-bold text-text-primary mb-1.5">{label}</div>
      <div className={`text-sm sm:text-base tabular ${valueClass}`}>{value}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 text-xs"><span className="text-text-muted">{label}</span><span className="text-right font-semibold break-all">{value}</span></div>
}

function formatSpot(value: number | null | undefined): string {
  if (value == null || value === undefined) return '—'
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(value % 1 === 0 ? 0 : 2)
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} title={label} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary"><span className="w-4 h-4">{children}</span></button>
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof BarChart3; title: string; description: string }) {
  return <div className="min-h-[240px] flex flex-col items-center justify-center text-center px-6"><div className="w-12 h-12 rounded-2xl bg-bg-tertiary border border-border-light flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-text-muted" /></div><div className="text-sm font-bold">{title}</div><div className="text-xs text-text-muted mt-1.5 max-w-[240px]">{description}</div></div>
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
