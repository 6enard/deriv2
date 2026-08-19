import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { errorMessage } from '../lib/error'
import { useOpenContracts } from '../hooks/useOpenContracts'
import { useMarketData } from '../hooks/useMarketData'
import type { SymbolInfo, Tick, OpenContract } from '../lib/types'
import { mapActiveSymbol } from '../lib/types'
import { TrendingUp, TrendingDown, Loader as Loader2, ChevronDown, Wallet, Clock, Activity, DollarSign, Target, Crosshair, ArrowUp, ArrowDown, CircleCheck as CheckCircle, Circle as XCircle, Crosshair as CrosshairIcon } from 'lucide-react'

type TradeTypeCategory = 'risefall' | 'higherlower' | 'touchnotouch' | 'endsinout' | 'staysinout'

interface TradeTypeOption {
  category: TradeTypeCategory
  label: string
  contractType: 'CALL' | 'PUT' | 'TOUCH' | 'NOTOUCH' | 'EXPIRYRANGE' | 'EXPIRYMISS' | 'RANGE' | 'MISS'
  side: 'up' | 'down' | 'touch' | 'notouch' | 'in' | 'out'
  displayName: string
}

const TRADE_TYPE_GROUPS: { group: string; types: TradeTypeOption[] }[] = [
  {
    group: 'Rise / Fall',
    types: [
      { category: 'risefall', label: 'Rise', contractType: 'CALL', side: 'up', displayName: 'Rise' },
      { category: 'risefall', label: 'Fall', contractType: 'PUT', side: 'down', displayName: 'Fall' },
    ],
  },
  {
    group: 'Higher / Lower',
    types: [
      { category: 'higherlower', label: 'Higher', contractType: 'CALL', side: 'up', displayName: 'Higher' },
      { category: 'higherlower', label: 'Lower', contractType: 'PUT', side: 'down', displayName: 'Lower' },
    ],
  },
  {
    group: 'Touch / No Touch',
    types: [
      { category: 'touchnotouch', label: 'Touch', contractType: 'TOUCH', side: 'touch', displayName: 'Touch' },
      { category: 'touchnotouch', label: 'No Touch', contractType: 'NOTOUCH', side: 'notouch', displayName: 'No Touch' },
    ],
  },
  {
    group: 'Ends In / Out',
    types: [
      { category: 'endsinout', label: 'Ends In', contractType: 'EXPIRYRANGE', side: 'in', displayName: 'Ends In' },
      { category: 'endsinout', label: 'Ends Out', contractType: 'EXPIRYMISS', side: 'out', displayName: 'Ends Out' },
    ],
  },
  {
    group: 'Stays In / Goes Out',
    types: [
      { category: 'staysinout', label: 'Stays In', contractType: 'RANGE', side: 'in', displayName: 'Stays In' },
      { category: 'staysinout', label: 'Goes Out', contractType: 'MISS', side: 'out', displayName: 'Goes Out' },
    ],
  },
]

const ALL_TRADE_TYPES = TRADE_TYPE_GROUPS.flatMap((g) => g.types)

function needsSingleBarrier(category: TradeTypeCategory): boolean {
  return category === 'higherlower' || category === 'touchnotouch'
}

function needsDoubleBarrier(category: TradeTypeCategory): boolean {
  return category === 'endsinout' || category === 'staysinout'
}

export default function Trade() {
  const { ws, account, refreshBalance } = useAuth()
  const { showToast } = useToast()
  const { openContractList, subscribeToContract, sellContract } = useOpenContracts()
  const { fetchSymbols } = useMarketData()

  const [symbols, setSymbols] = useState<SymbolInfo[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [ticks, setTicks] = useState<Tick[]>([])
  const [pipSize, setPipSize] = useState(2)
  const [stake, setStake] = useState('1')
  const [duration, setDuration] = useState('5')
  const [durationUnit, setDurationUnit] = useState('m')
  const [selectedTradeType, setSelectedTradeType] = useState<TradeTypeOption>(ALL_TRADE_TYPES[0])
  const [tradeTypeDropdownOpen, setTradeTypeDropdownOpen] = useState(false)
  const [barrier, setBarrier] = useState('')
  const [barrierHigh, setBarrierHigh] = useState('')
  const [barrierLow, setBarrierLow] = useState('')
  const [proposal, setProposal] = useState<{ askPrice: number; payout: number; spot: number } | null>(null)
  const [proposalLoading, setProposalLoading] = useState(false)
  const [proposalError, setProposalError] = useState<string | null>(null)
  const proposalReqIdRef = useRef<number | null>(null)
  const [isTrading, setIsTrading] = useState(false)
  const [loadingSymbols, setLoadingSymbols] = useState(true)
  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false)
  const [symbolSearch, setSymbolSearch] = useState('')
  const prevPriceRef = useRef<number | null>(null)
  const [flashClass, setFlashClass] = useState('')
  const tickSubIdRef = useRef<string | null>(null)

  const showToastCallback = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    showToast(type, message)
  }, [showToast])

  const formatPrice = useCallback((price: number) => {
    return price.toFixed(pipSize)
  }, [pipSize])

  // Load symbols on mount via the public (no-auth) WebSocket
  useEffect(() => {
    let cancelled = false
    setLoadingSymbols(true)
    fetchSymbols()
      .then((rawSymbols) => {
        if (cancelled || !rawSymbols) return
        const syms: SymbolInfo[] = rawSymbols.map((s: any) => mapActiveSymbol(s))
        setSymbols(syms)
        const firstVol = syms.find((s) => s.market === 'synthetic_index')
        setSelectedSymbol(firstVol?.symbol || syms[0]?.symbol || '')
        setLoadingSymbols(false)
      })
      .catch(() => {
        if (cancelled) return
        showToastCallback('error', 'Failed to load markets')
        setLoadingSymbols(false)
      })
    return () => { cancelled = true }
  }, [fetchSymbols, showToastCallback])

  // Subscribe to ticks — use forget(subscription_id) to stop old stream before starting new one
  useEffect(() => {
    if (!ws || !selectedSymbol) return
    let cancelled = false

    // Stop the previous tick subscription by its subscription id
    const stopPrevious = async () => {
      if (tickSubIdRef.current) {
        const oldId = tickSubIdRef.current
        tickSubIdRef.current = null
        try { await ws.forget(oldId) } catch { /* ignore */ }
      }
    }

    stopPrevious().then(() => {
      if (cancelled || !ws.isConnected) return
      setTicks([])
      prevPriceRef.current = null

      ws.subscribe({ ticks: selectedSymbol }, (data) => {
        const tick = data.tick
        const quote = parseFloat(tick.quote)
        const ps = tick.pip_size || 2
        setPipSize(ps)

        setTicks((prev) => [...prev.slice(-49), { symbol: tick.symbol, quote, epoch: tick.epoch, pip_size: ps }])

        if (prevPriceRef.current !== null) {
          if (quote > prevPriceRef.current) {
            setFlashClass('flash-green')
          } else if (quote < prevPriceRef.current) {
            setFlashClass('flash-red')
          }
          setTimeout(() => setFlashClass(''), 600)
        }
        prevPriceRef.current = quote
      }).then((res: any) => {
        if (cancelled) {
          if (res.subscription?.id) ws.forget(res.subscription.id).catch(() => {})
          return
        }
        tickSubIdRef.current = res.subscription?.id || null
      }).catch(() => {
        showToastCallback('error', 'Failed to subscribe to price feed')
      })
    })

    return () => {
      cancelled = true
    }
  }, [ws, selectedSymbol, showToastCallback])

  // Cleanup tick subscription on unmount
  useEffect(() => {
    return () => {
      if (tickSubIdRef.current && ws?.isConnected) {
        ws.forget(tickSubIdRef.current).catch(() => {})
        tickSubIdRef.current = null
      }
    }
  }, [ws])

  // Fetch live proposal (expected payout) whenever trade params change
  useEffect(() => {
    if (!ws || !selectedSymbol || !account) return
    const stakeNum = parseFloat(stake)
    const durationNum = parseInt(duration)
    if (!stakeNum || stakeNum <= 0 || !durationNum || durationNum <= 0) {
      setProposal(null)
      setProposalError(null)
      return
    }

    const category = selectedTradeType.category
    if ((needsSingleBarrier(category) && !barrier) || (needsDoubleBarrier(category) && (!barrierHigh || !barrierLow))) {
      setProposal(null)
      setProposalError(null)
      return
    }

    let cancelled = false
    setProposalLoading(true)
    setProposalError(null)

    const reqId = Date.now() + Math.random()
    proposalReqIdRef.current = reqId

    const request: Record<string, unknown> = {
      proposal: 1,
      amount: stakeNum,
      basis: 'stake',
      contract_type: selectedTradeType.contractType,
      currency: account.currency,
      duration: durationNum,
      duration_unit: durationUnit,
      underlying_symbol: selectedSymbol,
    }

    if (needsSingleBarrier(category)) {
      request.barrier = barrier
    } else if (needsDoubleBarrier(category)) {
      request.barrier = `${barrierHigh}`
      request.barrier2 = `${barrierLow}`
    }

    ws.send(request)
      .then((res) => {
        if (cancelled || proposalReqIdRef.current !== reqId) return
        if (res.proposal) {
          setProposal({
            askPrice: parseFloat(res.proposal.ask_price),
            payout: parseFloat(res.proposal.payout),
            spot: parseFloat(res.proposal.spot || '0'),
          })
          setProposalError(null)
        } else if (res.error) {
          setProposal(null)
          setProposalError(res.error.message || 'No proposal for these parameters')
        }
      })
      .catch((err) => {
        if (cancelled || proposalReqIdRef.current !== reqId) return
        setProposal(null)
        const msg = err?.message || 'Unable to fetch payout'
        setProposalError(msg)
      })
      .finally(() => {
        if (!cancelled && proposalReqIdRef.current === reqId) setProposalLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [ws, selectedSymbol, account, stake, duration, durationUnit, selectedTradeType, barrier, barrierHigh, barrierLow])

  const executeTrade = async () => {
    if (!ws || !account || !selectedSymbol) return

    setIsTrading(true)
    try {
      const category = selectedTradeType.category
      const request: Record<string, unknown> = {
        proposal: 1,
        amount: parseFloat(stake),
        basis: 'stake',
        contract_type: selectedTradeType.contractType,
        currency: account.currency,
        duration: parseInt(duration),
        duration_unit: durationUnit,
        underlying_symbol: selectedSymbol,
      }

      if (needsSingleBarrier(category)) {
        request.barrier = barrier
      } else if (needsDoubleBarrier(category)) {
        request.barrier = `${barrierHigh}`
        request.barrier2 = `${barrierLow}`
      }

      const proposalRes = await ws.send(request)

      const proposalData = proposalRes.proposal

      const buyRes = await ws.send({
        buy: proposalData.id,
        price: proposalData.ask_price,
      })

      const buyData = buyRes.buy
      showToastCallback('info', `${selectedTradeType.displayName} contract purchased for ${buyData.buy_price} ${account.currency}`)
      refreshBalance()

      subscribeToContract(buyData.contract_id)
    } catch (err: unknown) {
      showToastCallback('error', errorMessage(err, 'Trade failed. Please try again.'))
    } finally {
      setIsTrading(false)
    }
  }

  const currentSymbol = symbols.find((s) => s.symbol === selectedSymbol)
  const currentPrice = ticks.length > 0 ? ticks[ticks.length - 1].quote : null
  const firstPrice = ticks.length > 0 ? ticks[0].quote : null
  const priceChange = currentPrice && firstPrice ? currentPrice - firstPrice : 0
  const priceChangePercent = currentPrice && firstPrice ? ((priceChange / firstPrice) * 100) : 0
  const isUp = priceChange >= 0

  const minQuote = ticks.length > 0 ? Math.min(...ticks.map((t) => t.quote)) : 0
  const maxQuote = ticks.length > 0 ? Math.max(...ticks.map((t) => t.quote)) : 0

  const filteredSymbols = symbols.filter((s) =>
    s.display_name.toLowerCase().includes(symbolSearch.toLowerCase()),
  )

  const groupedSymbols = filteredSymbols.reduce((acc, s) => {
    const key = s.market_display_name
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {} as Record<string, SymbolInfo[]>)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Chart + Trade Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Symbol Selector + Price */}
          <div className="rounded-xl bg-bg-secondary border border-border-default p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div className="relative">
                <button
                  onClick={() => setSymbolDropdownOpen(!symbolDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-light hover:border-brand-blue transition-colors"
                >
                  <span className="font-semibold">{currentSymbol?.display_name || 'Select market'}</span>
                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                </button>

                {symbolDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-[calc(100vw-2.5rem)] max-w-80 max-h-96 overflow-y-auto rounded-xl bg-bg-secondary border border-border-light shadow-xl z-50">
                    <div className="p-2 sticky top-0 bg-bg-secondary border-b border-border-default">
                      <input
                        type="text"
                        value={symbolSearch}
                        onChange={(e) => setSymbolSearch(e.target.value)}
                        placeholder="Search markets..."
                        className="w-full px-3 py-2 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue"
                        autoFocus
                      />
                    </div>
                    {Object.entries(groupedSymbols).map(([market, syms]) => (
                      <div key={market}>
                        <div className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide">{market}</div>
                        {syms.map((s) => (
                          <button
                            key={s.symbol}
                            onClick={() => {
                              setSelectedSymbol(s.symbol)
                              setSymbolDropdownOpen(false)
                              setSymbolSearch('')
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors ${
                              s.symbol === selectedSymbol ? 'text-brand-green' : ''
                            }`}
                          >
                            {s.display_name}
                            {s.exchange_is_open === 0 && (
                              <span className="ml-2 text-xs text-text-muted">(closed)</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {currentSymbol && (
                <div className="text-left sm:text-right">
                  <div className={`text-2xl sm:text-3xl font-bold tabular ${flashClass} rounded px-2`}>
                    {currentPrice !== null ? formatPrice(currentPrice) : '---'}
                  </div>
                  <div className={`text-sm font-medium tabular mt-1 ${isUp ? 'text-brand-green' : 'text-brand-red'}`}>
                    {isUp ? '+' : ''}{priceChange.toFixed(pipSize)} ({isUp ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                  </div>
                </div>
              )}
            </div>

            {/* Tick Chart */}
            <TickChart ticks={ticks} pipSize={pipSize} />

            {/* High / Low */}
            {ticks.length > 1 && (
              <div className="flex items-center justify-between mt-3 text-xs text-text-secondary">
                <span>Low: <span className="tabular text-text-primary">{formatPrice(minQuote)}</span></span>
                <span>High: <span className="tabular text-text-primary">{formatPrice(maxQuote)}</span></span>
              </div>
            )}
          </div>

          {/* Trade Form */}
          <div className="rounded-xl bg-bg-secondary border border-border-default p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-green" />
              Place Trade
            </h3>

            {/* Trade Type Selector */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Trade Type</label>
              <div className="relative">
                <button
                  onClick={() => setTradeTypeDropdownOpen(!tradeTypeDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light hover:border-brand-blue transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <TradeTypeIcon option={selectedTradeType} />
                    <span className="text-sm font-medium">{selectedTradeType.displayName}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                </button>

                {tradeTypeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-xl bg-bg-secondary border border-border-light shadow-xl z-50">
                    {TRADE_TYPE_GROUPS.map((group) => (
                      <div key={group.group}>
                        <div className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide sticky top-0 bg-bg-secondary">
                          {group.group}
                        </div>
                        {group.types.map((opt) => (
                          <button
                            key={`${opt.category}-${opt.contractType}-${opt.side}`}
                            onClick={() => {
                              setSelectedTradeType(opt)
                              setTradeTypeDropdownOpen(false)
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors ${
                              selectedTradeType.displayName === opt.displayName ? 'text-brand-green' : ''
                            }`}
                          >
                            <TradeTypeIcon option={opt} />
                            {opt.displayName}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Barrier inputs for Higher/Lower and Touch/No Touch */}
            {needsSingleBarrier(selectedTradeType.category) && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  {selectedTradeType.category === 'touchnotouch' ? 'Barrier (price target)' : 'Barrier (offset from spot)'}
                </label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={barrier}
                    onChange={(e) => setBarrier(e.target.value)}
                    placeholder={selectedTradeType.category === 'touchnotouch' ? 'e.g. 1.1050' : 'e.g. +0.50 or -0.50'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Double barriers for Ends In/Out and Stays In/Goes Out */}
            {needsDoubleBarrier(selectedTradeType.category) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Upper Barrier</label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={barrierHigh}
                      onChange={(e) => setBarrierHigh(e.target.value)}
                      placeholder="e.g. +0.50"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Lower Barrier</label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={barrierLow}
                      onChange={(e) => setBarrierLow(e.target.value)}
                      placeholder="e.g. -0.50"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Stake ({account?.currency || 'USD'})</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="number"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    min="0.35"
                    step="0.01"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Duration</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors"
                  >
                    <option value="t">ticks</option>
                    <option value="s">sec</option>
                    <option value="m">min</option>
                    <option value="h">hrs</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Expected Payout Display */}
            <div className="rounded-xl bg-bg-tertiary border border-border-light p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5" />
                  Expected Payout
                </span>
                {proposalLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-text-secondary" />
                ) : proposal ? (
                  <span className="text-lg font-bold tabular text-brand-green">
                    {proposal.payout.toFixed(2)} {account?.currency || 'USD'}
                  </span>
                ) : (
                  <span className="text-sm text-text-muted">—</span>
                )}
              </div>
              {proposal && !proposalLoading && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">
                    Cost / Ask price: <span className="tabular text-text-secondary font-medium">{proposal.askPrice.toFixed(2)} {account?.currency || ''}</span>
                  </span>
                  <span className="text-text-muted">
                    Potential profit: <span className="tabular text-brand-green font-medium">+{(proposal.payout - proposal.askPrice).toFixed(2)} {account?.currency || ''}</span>
                  </span>
                </div>
              )}
              {proposalError && !proposalLoading && (
                <p className="text-xs text-brand-amber mt-1">{proposalError}</p>
              )}
            </div>

            <button
              onClick={executeTrade}
              disabled={isTrading || !selectedSymbol || loadingSymbols || currentSymbol?.exchange_is_open === 0 || !proposal || proposalLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-green text-bg-primary font-bold hover:bg-brand-green-dim transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTrading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TradeTypeIcon option={selectedTradeType} />}
              Buy {selectedTradeType.displayName}
            </button>

            {currentSymbol?.exchange_is_open === 0 && (
              <p className="text-xs text-brand-amber mt-3 text-center">This market is currently closed.</p>
            )}
          </div>
        </div>

        {/* Right: Open Positions */}
        <div className="space-y-4">
          <div className="rounded-xl bg-bg-secondary border border-border-default p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-blue" />
              Open Positions
              {openContractList.length > 0 && (
                <span className="ml-auto text-xs text-text-muted">{openContractList.length}</span>
              )}
            </h3>

            {openContractList.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                No open positions. Place a trade to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {openContractList.map((contract) => (
                  <ContractCard
                    key={contract.contract_id}
                    contract={contract}
                    currency={account?.currency || 'USD'}
                    onSell={() => sellContract(contract.contract_id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Account Summary */}
          {account && (
            <div className="rounded-xl bg-bg-secondary border border-border-default p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-brand-green" />
                Account
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Login ID</span>
                  <span className="font-medium">{account.account_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Balance</span>
                  <span className="font-medium tabular">{account.balance.toFixed(2)} {account.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Type</span>
                  <span className="font-medium">{account.account_type === 'demo' ? 'Demo' : 'Real'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TickChart({ ticks }: { ticks: Tick[]; pipSize: number }) {
  if (ticks.length < 2) {
    return (
      <div className="h-[200px] flex items-center justify-center text-text-muted text-sm">
        {ticks.length === 0 ? 'Waiting for live price data...' : 'Loading chart...'}
      </div>
    )
  }

  const quotes = ticks.map((t) => t.quote)
  const min = Math.min(...quotes)
  const max = Math.max(...quotes)
  const range = max - min || 1
  const width = 800
  const height = 200
  const pad = 10

  const points = quotes.map((q, i) => ({
    x: (i / (quotes.length - 1)) * (width - pad * 2) + pad,
    y: height - pad - ((q - min) / range) * (height - pad * 2),
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`

  const isUp = quotes[quotes.length - 1] >= quotes[0]
  const color = isUp ? '#e53935' : '#e53935'

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[200px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id="tick-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#tick-area)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="8" fill={color} fillOpacity="0.2" />
    </svg>
  )
}

function ContractCard({
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

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <span className="text-text-muted">Buy: </span>
          <span className="tabular font-medium">{contract.buy_price.toFixed(2)} {currency}</span>
        </div>
        <div>
          <span className="text-text-muted">Payout: </span>
          <span className="tabular font-medium">{contract.payout.toFixed(2)} {currency}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-text-muted">P/L: </span>
          <span className={`text-sm font-bold tabular ${isProfit ? 'text-brand-green' : 'text-brand-red'}`}>
            {isProfit ? '+' : ''}{profit.toFixed(2)} {currency}
          </span>
        </div>
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

function TradeTypeIcon({ option }: { option: TradeTypeOption }) {
  const side = option.side
  if (side === 'up') return <ArrowUp className="w-4 h-4 text-brand-green" />
  if (side === 'down') return <ArrowDown className="w-4 h-4 text-brand-red" />
  if (side === 'touch') return <CheckCircle className="w-4 h-4 text-brand-green" />
  if (side === 'notouch') return <XCircle className="w-4 h-4 text-brand-red" />
  if (side === 'in') return <CrosshairIcon className="w-4 h-4 text-brand-green" />
  return <CrosshairIcon className="w-4 h-4 text-brand-red" />
}
