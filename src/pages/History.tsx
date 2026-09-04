import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOpenContracts } from '../hooks/useOpenContracts'
import { errorMessage } from '../lib/error'
import type { OpenContract } from '../lib/types'
import { TrendingUp, TrendingDown, Wallet, Award, ChartBar as BarChart3, RefreshCw, Loader as Loader2, ChevronDown, Calendar, ListFilter as Filter } from 'lucide-react'
import { HistorySkeleton } from '../components/Skeleton'

interface ClosedTrade {
  contract_id: number
  symbol: string
  display_name: string
  contract_type: string
  buy_price: number
  sell_price: number
  profit: number
  purchase_time: number
  sell_time: number
  status: string
}

interface StatementEntry {
  id: number
  amount: number
  balance: number
  action_type: string
  longcode: string
  shortcode: string
  transaction_time: number
}

type SubView = 'open' | 'closed' | 'statement'

export default function History() {
  const { ws, account, accountType } = useAuth()
  const { openContractList, sellContract, refreshPortfolio } = useOpenContracts()
  const [subView, setSubView] = useState<SubView>('open')
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([])
  const [statement, setStatement] = useState<StatementEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Date filters
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10))
  const [showFilters, setShowFilters] = useState(false)

  const loadClosedTrades = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (!ws) return
    try {
      const params: Record<string, unknown> = {
        profit_table: 1,
        description: 1,
        limit: 50,
        sort: 'DESC',
      }
      if (dateFrom) params.date_from = Math.floor(new Date(dateFrom).getTime() / 1000)
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59)
        params.date_to = Math.floor(endOfDay.getTime() / 1000)
      }
      if (offset > 0) params.offset = offset

      const res = await ws.send(params)
      if (res.error) throw new Error(res.error.message)
      if (res.profit_table?.transactions) {
        const mapped: ClosedTrade[] = res.profit_table.transactions.map((t: any) => {
          const buyPrice = parseFloat(t.buy_price || '0')
          const sellPrice = parseFloat(t.sell_price || '0')
          const profit = t.profit != null ? parseFloat(t.profit) : sellPrice - buyPrice
          return {
            contract_id: t.contract_id,
            symbol: t.underlying_symbol ?? t.symbol ?? '',
            display_name: t.longcode || t.shortcode || t.underlying_symbol || t.symbol || '',
            contract_type: t.contract_type || '',
            buy_price: buyPrice,
            sell_price: sellPrice,
            profit,
            purchase_time: t.purchase_time,
            sell_time: t.sell_time,
            status: profit >= 0 ? 'won' : 'lost',
          }
        })
        setClosedTrades(append ? [...closedTrades, ...mapped] : mapped)
        setHasMore(mapped.length >= 50)
      } else {
        if (!append) setClosedTrades([])
        setHasMore(false)
      }
    } catch (err) {
      setError(errorMessage(err, 'Failed to load closed trades'))
    }
  }, [ws, dateFrom, dateTo, closedTrades])

  const loadStatement = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (!ws) return
    try {
      const params: Record<string, unknown> = {
        statement: 1,
        limit: 100,
      }
      if (dateFrom) params.date_from = Math.floor(new Date(dateFrom).getTime() / 1000)
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59)
        params.date_to = Math.floor(endOfDay.getTime() / 1000)
      }
      if (offset > 0) params.offset = offset

      const res = await ws.send(params)
      if (res.error) throw new Error(res.error.message)
      if (res.statement?.transactions) {
        const mapped: StatementEntry[] = res.statement.transactions.map((t: any) => ({
          id: t.id,
          amount: parseFloat(t.amount || '0'),
          balance: parseFloat(t.balance || '0'),
          action_type: t.action_type || '',
          longcode: t.longcode || '',
          shortcode: t.shortcode || '',
          transaction_time: t.transaction_time,
        }))
        setStatement(append ? [...statement, ...mapped] : mapped)
        setHasMore(mapped.length >= 100)
      } else {
        if (!append) setStatement([])
        setHasMore(false)
      }
    } catch (err) {
      setError(errorMessage(err, 'Failed to load statement'))
    }
  }, [ws, dateFrom, dateTo, statement])

  const loadAll = useCallback(async () => {
    if (!ws) return
    setRefreshing(true)
    setError(null)
    try {
      await refreshPortfolio()
      await loadClosedTrades(0, false)
    } catch (err) {
      setError(errorMessage(err, 'Failed to load history'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [ws, refreshPortfolio, loadClosedTrades])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!loading && ws) {
      setLoading(true)
      loadAll()
    }
  }, [accountType])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    try {
      if (subView === 'closed') {
        await loadClosedTrades(closedTrades.length, true)
      } else if (subView === 'statement') {
        await loadStatement(statement.length, true)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const handleApplyFilters = () => {
    setLoading(true)
    if (subView === 'closed') {
      loadClosedTrades(0, false).finally(() => setLoading(false))
    } else if (subView === 'statement') {
      loadStatement(0, false).finally(() => setLoading(false))
    }
    setShowFilters(false)
  }

  const totalProfit = closedTrades.reduce((sum, t) => sum + t.profit, 0)
  const wins = closedTrades.filter((t) => t.profit > 0).length
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0

  if (loading) {
    return <HistorySkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Trade History</h1>
          <p className="text-sm text-text-secondary mt-1">
            {accountType === 'demo' ? 'Demo' : 'Real'} account · {account?.account_id || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(subView === 'closed' || subView === 'statement') && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-secondary border border-border-light text-sm hover:bg-bg-tertiary transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button
            onClick={loadAll}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-secondary border border-border-light text-sm hover:bg-bg-tertiary transition-colors disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Sub-view tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        <SubTabButton active={subView === 'open'} onClick={() => setSubView('open')} label="Open Positions" count={openContractList.length} />
        <SubTabButton active={subView === 'closed'} onClick={() => setSubView('closed')} label="Closed Trades" count={closedTrades.length} />
        <SubTabButton active={subView === 'statement'} onClick={() => setSubView('statement')} label="Statement" count={statement.length} />
      </div>

      {/* Date filters */}
      {showFilters && (subView === 'closed' || subView === 'statement') && (
        <div className="rounded-xl bg-bg-secondary border border-border-light p-4 mb-6 slide-in">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10 pr-3 py-2 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10 pr-3 py-2 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors"
                />
              </div>
            </div>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 rounded-xl bg-brand-green text-bg-primary font-medium text-sm hover:bg-brand-green-dim transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3 text-sm text-brand-red mb-6">
          {error}
        </div>
      )}

      {/* Summary cards for closed trades */}
      {subView === 'closed' && closedTrades.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <SummaryCard icon={Wallet} label="Balance" value={`${account?.balance.toFixed(2) || '0.00'} ${account?.currency || ''}`} color="text-text-primary" />
          <SummaryCard icon={BarChart3} label="Total P/L" value={`${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} ${account?.currency || ''}`} color={totalProfit >= 0 ? 'text-brand-green' : 'text-brand-red'} />
          <SummaryCard icon={Award} label="Win Rate" value={`${winRate.toFixed(1)}%`} color={winRate >= 50 ? 'text-brand-green' : 'text-brand-amber'} />
          <SummaryCard icon={TrendingUp} label="Total Trades" value={String(closedTrades.length)} color="text-text-primary" />
        </div>
      )}

      {/* Open Positions */}
      {subView === 'open' && (
        <div className="rounded-xl bg-bg-secondary border border-border-default p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-green" />
            Open Positions
            {openContractList.length > 0 && <span className="ml-auto text-sm text-text-muted">{openContractList.length}</span>}
          </h2>
          {openContractList.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">No open positions on this account.</div>
          ) : (
            <div className="space-y-3">
              {openContractList.map((contract) => (
                <HistoryOpenPositionCard
                  key={contract.contract_id}
                  contract={contract}
                  currency={account?.currency || 'USD'}
                  onSell={() => sellContract(contract.contract_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Closed Trades */}
      {subView === 'closed' && (
        <div className="rounded-xl bg-bg-secondary border border-border-default p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-blue" />
            Closed Trades
            {closedTrades.length > 0 && <span className="ml-auto text-sm text-text-muted">{closedTrades.length}</span>}
          </h2>
          {closedTrades.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">No closed trades in this period.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-muted border-b border-border-default">
                      <th className="pb-2 pr-4 font-medium">Market</th>
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 pr-4 font-medium text-right">Buy</th>
                      <th className="pb-2 pr-4 font-medium text-right">Sell</th>
                      <th className="pb-2 pr-4 font-medium text-right">P/L</th>
                      <th className="pb-2 font-medium text-right">Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.map((trade) => (
                      <tr key={trade.contract_id} className="border-b border-border-default/50 hover:bg-bg-tertiary/50 transition-colors">
                        <td className="py-3 pr-4 font-medium max-w-xs truncate">{trade.display_name}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-medium ${trade.contract_type === 'CALL' ? 'text-brand-green' : trade.contract_type === 'PUT' ? 'text-brand-red' : 'text-text-secondary'}`}>
                            {trade.contract_type === 'CALL' ? 'UP' : trade.contract_type === 'PUT' ? 'DOWN' : trade.contract_type}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right tabular text-text-secondary">{trade.buy_price.toFixed(2)}</td>
                        <td className="py-3 pr-4 text-right tabular text-text-secondary">{trade.sell_price.toFixed(2)}</td>
                        <td className={`py-3 pr-4 text-right tabular font-bold ${trade.profit >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                          {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                        </td>
                        <td className="py-3 text-right text-text-muted text-xs">{new Date(trade.sell_time * 1000).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm font-medium hover:bg-bg-hover transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Statement */}
      {subView === 'statement' && (
        <div className="rounded-xl bg-bg-secondary border border-border-default p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-brand-amber" />
            Transaction Statement
            {statement.length > 0 && <span className="ml-auto text-sm text-text-muted">{statement.length}</span>}
          </h2>
          {statement.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">No transactions in this period.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-muted border-b border-border-default">
                      <th className="pb-2 pr-4 font-medium">Time</th>
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 pr-4 font-medium">Description</th>
                      <th className="pb-2 pr-4 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.map((entry) => (
                      <tr key={entry.id} className="border-b border-border-default/50 hover:bg-bg-tertiary/50 transition-colors">
                        <td className="py-3 pr-4 text-text-muted text-xs whitespace-nowrap">{new Date(entry.transaction_time * 1000).toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-medium ${entry.amount >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                            {entry.action_type}
                          </span>
                        </td>
                        <td className="py-3 pr-4 max-w-md truncate text-text-secondary">{entry.longcode || entry.shortcode}</td>
                        <td className={`py-3 pr-4 text-right tabular font-medium ${entry.amount >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                          {entry.amount >= 0 ? '+' : ''}{entry.amount.toFixed(2)}
                        </td>
                        <td className="py-3 text-right tabular text-text-secondary">{entry.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm font-medium hover:bg-bg-hover transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SubTabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-bg-tertiary text-text-primary border border-border-light'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-brand-green/20 text-brand-green' : 'bg-bg-hover text-text-muted'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-bg-secondary border border-border-default p-4">
      <div className="flex items-center gap-2 mb-2 text-text-muted">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-lg font-bold tabular ${color}`}>{value}</div>
    </div>
  )
}

function HistoryOpenPositionCard({
  contract,
  currency,
  onSell,
}: {
  contract: OpenContract
  currency: string
  onSell: () => void
}) {
  const isCall = contract.contract_type === 'CALL'
  const profit = contract.profit
  const isProfit = profit >= 0

  return (
    <div className="rounded-xl bg-bg-tertiary border border-border-light p-3 slide-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center ${isCall ? 'bg-brand-green/15' : 'bg-brand-red/15'}`}>
            {isCall ? <TrendingUp className="w-3.5 h-3.5 text-brand-green" /> : <TrendingDown className="w-3.5 h-3.5 text-brand-red" />}
          </div>
          <span className="text-sm font-medium">{contract.display_name || contract.symbol}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${isCall ? 'text-brand-green' : 'text-brand-red'}`}>
          {isCall ? 'UP' : 'DOWN'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div>
          <span className="text-text-muted">Buy: </span>
          <span className="tabular font-medium">{contract.buy_price.toFixed(2)} {currency}</span>
        </div>
        <div>
          <span className="text-text-muted">Payout: </span>
          <span className="tabular font-medium">{contract.payout.toFixed(2)} {currency}</span>
        </div>
        <div>
          <span className="text-text-muted">P/L: </span>
          <span className={`tabular font-bold ${isProfit ? 'text-brand-green' : 'text-brand-red'}`}>
            {isProfit ? '+' : ''}{profit.toFixed(2)} {currency}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={onSell}
          className="px-3 py-1.5 rounded-xl bg-bg-hover text-xs font-medium hover:bg-border-light transition-colors"
        >
          Sell
        </button>
      </div>
    </div>
  )
}
