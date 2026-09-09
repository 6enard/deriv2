import { useState, type ReactNode, type RefObject } from 'react'
import {
  ChartBar as BarChart3,
  List,
  ScrollText,
  Trash2,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Download,
  X,
  Circle,
  Pause,
} from 'lucide-react'
import type { OpenContract } from '../lib/types'
import type { RunStats, JournalEntry } from '../context/BotRunnerContext'

export type ResultsTab = 'summary' | 'transactions' | 'journal'

const TAB_DEFS: Array<{ id: ResultsTab; label: string; icon: typeof BarChart3 }> = [
  { id: 'summary', label: 'Summary', icon: BarChart3 },
  { id: 'transactions', label: 'Transactions', icon: List },
  { id: 'journal', label: 'Journal', icon: ScrollText },
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
  const statusLabel = hasPurchased ? 'Contract bought' : 'Waiting for a signal to buy a contract'
  const winRate = runStats.wins + runStats.losses > 0 ? (runStats.wins / (runStats.wins + runStats.losses)) * 100 : 0
  const latest = trades[0]

  const downloadTransactionsCsv = () => {
    const rows = trades.map((contract) => [
      contract.display_name || contract.symbol,
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
    <div className="bg-bg-secondary flex flex-col h-full min-h-0">
      {isRunning && (
        <div className="flex items-center gap-0 px-3 sm:px-4 py-3 border-b border-border-default shrink-0">
          <button type="button" onClick={onStop} className="h-12 sm:h-14 px-5 sm:px-7 rounded-l-xl bg-brand-red text-white flex items-center gap-3 font-bold text-base sm:text-lg hover:bg-brand-red-dim transition-colors">
            <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            Stop
          </button>
          <div className="flex-1 min-w-0 h-12 sm:h-14 rounded-r-xl border border-border-light border-l-0 bg-bg-primary px-4 sm:px-6 flex flex-col items-center justify-center">
            <span className="font-bold text-sm sm:text-base text-text-primary truncate max-w-full">{statusLabel}</span>
            <div className="flex items-center gap-1 w-full max-w-[280px] mt-2">
              {[0, 1, 2, 3, 4].map((step) => (
                <span key={step} className={`h-1.5 flex-1 rounded-full ${step < (hasPurchased ? 4 : 1) ? 'bg-[#56b4b7] tick-progress' : 'bg-bg-hover'}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center border-b border-border-default shrink-0 px-2 sm:px-3">
        <div className="flex items-center flex-1">
          {TAB_DEFS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => onTabChange(id)} className={`relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-4 text-sm sm:text-base transition-colors ${tab === id ? 'font-bold text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
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
        {tab === 'summary' && <SummaryView runStats={runStats} winRate={winRate} currency={currency} latest={latest} onReset={onResetStats} />}
        {tab === 'transactions' && <TransactionsView trades={trades} currency={currency} onDetails={setDetailContract} onReset={onResetStats} onDownload={downloadTransactionsCsv} />}
        {tab === 'journal' && <JournalView journal={journal} journalEndRef={journalEndRef} onReset={onResetStats} onClear={onClearJournal} onDownload={downloadJournalTxt} />}
      </div>

      {detailContract && <ContractDetails contract={detailContract} currency={currency} onClose={() => setDetailContract(null)} />}
    </div>
  )
}

function SummaryView({ runStats, winRate, currency, latest, onReset }: { runStats: RunStats; winRate: number; currency: string; latest?: OpenContract; onReset: () => void }) {
  const profit = latest?.profit ?? runStats.totalProfit
  const buyPrice = latest?.buy_price ?? runStats.totalStake
  const payout = latest?.payout ?? runStats.totalPayout

  return (
    <div className="p-3 sm:p-5 space-y-4">
      <div className="rounded-xl border border-border-light bg-bg-primary/40 p-4 sm:p-8">
        <div className="flex items-center gap-1 mb-7">
          {[0, 1, 2, 3, 4].map((step) => <span key={step} className={`h-2 flex-1 rounded-sm ${step < 4 ? 'bg-[#7caeb0] tick-progress' : 'bg-bg-hover'}`} />)}
        </div>
        <div className="inline-flex rounded-lg bg-[#82adaf] px-2 py-1 text-xs font-bold text-white mb-6">{currency}</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-7">
          <Quote label="Potential profit/loss" value={`${profit >= 0 ? '+' : ''}${profit.toFixed(2)}`} valueClass={profit >= 0 ? 'text-[#4eb5b7]' : 'text-brand-red'} />
          <Quote label="Indicative price" value={latest ? payout.toFixed(2) : '—'} />
          <Quote label="Buy price" value={buyPrice.toFixed(2)} />
          <Quote label="Payout limit" value={latest ? payout.toFixed(2) : '—'} />
        </div>
        <div className="mt-8 pt-7 border-t border-border-default text-center text-base sm:text-lg text-text-secondary">{latest && !latest.is_sold ? 'Resale not offered' : 'No active contract'}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-7 bg-bg-tertiary/60 px-4 sm:px-6 py-6 sm:py-7">
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
      <div className="grid grid-cols-[0.8fr_1.2fr_1fr] gap-3 px-4 sm:px-7 py-4 border-b border-border-default text-xs sm:text-sm font-bold text-text-primary">
        <span>Type</span><span>Entry/Exit spot</span><span className="text-right">Buy price and P/L</span>
      </div>
      {trades.map((contract) => {
        const isUp = ['CALL', 'CALLE', 'HIGHER', 'ONETOUCH'].includes(contract.contract_type)
        const isPositive = contract.profit >= 0
        return (
          <button key={contract.contract_id} onClick={() => onDetails(contract)} className="w-full grid grid-cols-[0.8fr_1.2fr_1fr] gap-3 items-center px-4 sm:px-7 py-4 border-b border-border-default text-left hover:bg-bg-tertiary transition-colors">
            <span className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              {isUp ? <TrendingUp className="w-5 h-5 text-brand-green" /> : <TrendingDown className="w-5 h-5 text-brand-red" />}
              <span className="hidden sm:inline">{contract.contract_type || 'Trade'}</span>
            </span>
            <span className="text-xs sm:text-sm tabular text-text-primary space-y-1">
              <span className="flex items-center gap-2"><Circle className="w-4 h-4 text-brand-red fill-brand-red/10" />{formatSpot(contract.entry_spot)}</span>
              <span className="flex items-center gap-2"><Circle className="w-4 h-4 text-text-muted" />{formatSpot(contract.exit_spot)}</span>
            </span>
            <span className="text-right text-xs sm:text-sm tabular"><span className="block text-text-primary">{contract.buy_price.toFixed(2)} {currency}</span><span className={isPositive ? 'text-[#4eb5b7]' : 'text-brand-red'}>{isPositive ? '+' : ''}{contract.profit.toFixed(2)} {currency}</span></span>
          </button>
        )
      })}
      <div className="grid grid-cols-3 gap-3 bg-bg-tertiary/70 px-4 sm:px-7 py-6 text-center">
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
  return <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}><div className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-bg-secondary border border-border-light shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between px-5 py-4 border-b border-border-default"><div><div className="text-[10px] uppercase tracking-wider text-text-muted">Contract</div><h2 className="font-bold text-lg">Contract details</h2></div><button onClick={onClose} className="w-9 h-9 rounded-xl bg-bg-tertiary flex items-center justify-center"><X className="w-4 h-4" /></button></div><div className="p-5 space-y-4"><div className={`rounded-2xl p-4 border ${contract.profit >= 0 ? 'bg-brand-green/10 border-brand-green/20' : 'bg-brand-red/10 border-brand-red/20'}`}><div className="text-xs text-text-muted">Contract P/L</div><div className={`text-2xl font-bold tabular mt-1 ${contract.profit >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>{contract.profit >= 0 ? '+' : ''}{contract.profit.toFixed(2)} {currency}</div></div><div className="rounded-2xl bg-bg-tertiary border border-border-light p-4 space-y-3"><DetailRow label="Symbol" value={contract.display_name || contract.symbol} /><DetailRow label="Type" value={contract.contract_type || '—'} /><DetailRow label="Status" value={contract.is_sold ? contract.status : 'Open'} /><DetailRow label="Buy price" value={`${contract.buy_price.toFixed(2)} ${currency}`} /><DetailRow label="Payout" value={`${contract.payout.toFixed(2)} ${currency}`} /><DetailRow label="Entry spot" value={formatSpot(contract.entry_spot)} /><DetailRow label="Exit spot" value={formatSpot(contract.exit_spot)} /><DetailRow label="Purchase time" value={contract.purchase_time ? new Date(contract.purchase_time * 1000).toLocaleString() : '—'} /></div></div></div></div>
}

function Quote({ label, value, valueClass = 'text-text-primary' }: { label: string; value: string; valueClass?: string }) { return <div><div className="text-sm sm:text-base text-text-secondary mb-1">{label}:</div><div className={`text-xl sm:text-2xl font-bold tabular ${valueClass}`}>{value}</div></div> }
function BottomStat({ label, value, valueClass = 'text-text-primary' }: { label: string; value: string; valueClass?: string }) { return <div><div className="text-xs sm:text-sm font-bold text-text-primary mb-2">{label}</div><div className={`text-sm sm:text-base tabular ${valueClass}`}>{value}</div></div> }
function DetailRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 text-xs"><span className="text-text-muted">{label}</span><span className="text-right font-semibold break-all">{value}</span></div> }
function formatSpot(value: number | null | undefined): string { return value == null ? '—' : value.toFixed(value % 1 === 0 ? 0 : 2) }
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) { return <button onClick={onClick} title={label} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary"><span className="w-4 h-4">{children}</span></button> }
function EmptyState({ icon: Icon, title, description }: { icon: typeof BarChart3; title: string; description: string }) { return <div className="min-h-[240px] flex flex-col items-center justify-center text-center px-6"><div className="w-12 h-12 rounded-2xl bg-bg-tertiary border border-border-light flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-text-muted" /></div><div className="text-sm font-bold">{title}</div><div className="text-xs text-text-muted mt-1.5 max-w-[240px]">{description}</div></div> }
function triggerDownload(content: string, filename: string) { const blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); document.body.removeChild(anchor); URL.revokeObjectURL(url) }
