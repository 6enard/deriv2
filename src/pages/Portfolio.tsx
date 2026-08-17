import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { TrendingUp, TrendingDown, Wallet, Award, ChartBar as BarChart3, RefreshCw, Loader as Loader2 } from 'lucide-react'

interface PortfolioPosition {
  contract_id: number
  symbol: string
  display_name: string
  contract_type: string
  buy_price: number
  purchase_time: number
  payout: number
}

interface ProfitTableEntry {
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

export default function Portfolio() {
  const { ws, account } = useAuth()
  const [openPositions, setOpenPositions] = useState<PortfolioPosition[]>([])
  const [tradeHistory, setTradeHistory] = useState<ProfitTableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    if (!ws) return
    setRefreshing(true)
    try {
      const [portfolioRes, profitRes] = await Promise.all([
        ws.send({ portfolio: 1 }),
        ws.send({ profit_table: 1, description: 1, limit: 50, sort: 'DESC' }),
      ])

      if (portfolioRes.portfolio?.contracts) {
        setOpenPositions(portfolioRes.portfolio.contracts.map((p: any) => ({
          contract_id: p.contract_id,
          symbol: p.underlying_symbol ?? p.symbol ?? '',
          display_name: p.underlying_symbol ?? p.display_name ?? p.symbol ?? '',
          contract_type: p.contract_type,
          buy_price: parseFloat(p.buy_price),
          purchase_time: p.purchase_time,
          payout: parseFloat(p.payout || '0'),
        })))
      }

      if (profitRes.profit_table?.transactions) {
        setTradeHistory(profitRes.profit_table.transactions.map((t: any) => ({
          contract_id: t.contract_id,
          symbol: t.underlying_symbol ?? t.symbol ?? '',
          display_name: t.longcode || t.shortcode || t.underlying_symbol || t.symbol || '',
          contract_type: t.contract_type || '',
          buy_price: parseFloat(t.buy_price || '0'),
          sell_price: parseFloat(t.sell_price || '0'),
          profit: parseFloat(t.profit || '0'),
          purchase_time: t.purchase_time,
          sell_time: t.sell_time,
          status: parseFloat(t.profit) >= 0 ? 'won' : 'lost',
        })))
      }
    } catch (err) {
      console.error('Failed to load portfolio data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [ws])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Also load trades from Supabase (trades made through our app)
  const [appTrades, setAppTrades] = useState<any[]>([])
  useEffect(() => {
    if (!account) return
    supabase
      .from('trades')
      .select('*')
      .eq('deriv_account_id', account.account_id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setAppTrades(data)
      })
  }, [account])

  const totalProfit = tradeHistory.reduce((sum, t) => sum + t.profit, 0)
  const wins = tradeHistory.filter((t) => t.profit > 0).length
  const winRate = tradeHistory.length > 0 ? (wins / tradeHistory.length) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm hover:bg-bg-tertiary transition-colors disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          icon={Wallet}
          label="Balance"
          value={`${account?.balance.toFixed(2) || '0.00'} ${account?.currency || ''}`}
          color="text-text-primary"
        />
        <SummaryCard
          icon={BarChart3}
          label="Total P/L"
          value={`${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} ${account?.currency || ''}`}
          color={totalProfit >= 0 ? 'text-brand-green' : 'text-brand-red'}
        />
        <SummaryCard
          icon={Award}
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          color={winRate >= 50 ? 'text-brand-green' : 'text-brand-amber'}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Total Trades"
          value={String(tradeHistory.length)}
          color="text-text-primary"
        />
      </div>

      {/* Open Positions */}
      <div className="rounded-xl bg-bg-secondary border border-border-default p-5 mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-green" />
          Open Positions
          {openPositions.length > 0 && (
            <span className="ml-auto text-sm text-text-muted">{openPositions.length}</span>
          )}
        </h2>

        {openPositions.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">No open positions.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b border-border-default">
                  <th className="pb-2 pr-4 font-medium">Market</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium text-right">Stake</th>
                  <th className="pb-2 pr-4 font-medium text-right">Payout</th>
                  <th className="pb-2 font-medium text-right">Purchased</th>
                </tr>
              </thead>
              <tbody>
                {openPositions.map((pos) => (
                  <tr key={pos.contract_id} className="border-b border-border-default/50">
                    <td className="py-3 pr-4 font-medium">{pos.display_name}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-medium ${pos.contract_type === 'CALL' ? 'text-brand-green' : 'text-brand-red'}`}>
                        {pos.contract_type === 'CALL' ? 'UP' : 'DOWN'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular">{pos.buy_price.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-right tabular">{pos.payout.toFixed(2)}</td>
                    <td className="py-3 text-right text-text-muted text-xs">
                      {new Date(pos.purchase_time * 1000).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade History */}
      <div className="rounded-xl bg-bg-secondary border border-border-default p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-blue" />
          Trade History
          {tradeHistory.length > 0 && (
            <span className="ml-auto text-sm text-text-muted">{tradeHistory.length}</span>
          )}
        </h2>

        {tradeHistory.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">No trade history yet.</div>
        ) : (
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
                {tradeHistory.map((trade) => (
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
                    <td className="py-3 text-right text-text-muted text-xs">
                      {new Date(trade.sell_time * 1000).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trades through our app */}
      {appTrades.length > 0 && (
        <div className="rounded-xl bg-bg-secondary border border-border-default p-5 mt-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-brand-amber" />
            Trades via DerivMarkets
            <span className="ml-auto text-sm text-text-muted">{appTrades.length}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b border-border-default">
                  <th className="pb-2 pr-4 font-medium">Market</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium text-right">Stake</th>
                  <th className="pb-2 pr-4 font-medium text-right">P/L</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {appTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-border-default/50">
                    <td className="py-3 pr-4 font-medium">{trade.display_name || trade.symbol}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-medium ${trade.contract_type === 'CALL' ? 'text-brand-green' : 'text-brand-red'}`}>
                        {trade.contract_type === 'CALL' ? 'UP' : 'DOWN'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular">{parseFloat(trade.stake).toFixed(2)}</td>
                    <td className={`py-3 pr-4 text-right tabular font-bold ${parseFloat(trade.profit) >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                      {parseFloat(trade.profit) >= 0 ? '+' : ''}{parseFloat(trade.profit).toFixed(2)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded ${trade.status === 'won' ? 'bg-brand-green/15 text-brand-green' : trade.status === 'lost' ? 'bg-brand-red/15 text-brand-red' : 'bg-bg-tertiary text-text-secondary'}`}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
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
