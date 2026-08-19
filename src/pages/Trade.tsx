import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { errorMessage } from '../lib/error'
import { useOpenContracts } from '../hooks/useOpenContracts'
import { useMarketData } from '../hooks/useMarketData'
import { DerivWS } from '../lib/deriv-ws'
import { PUBLIC_WS_URL } from '../lib/config'
import type { SymbolInfo, Tick, OpenContract } from '../lib/types'
import { mapActiveSymbol } from '../lib/types'
import { TrendingUp, TrendingDown, Loader as Loader2, ChevronDown, Wallet, Clock, Activity, DollarSign, Target, Crosshair, ArrowUp, ArrowDown, CircleCheck as CheckCircle, Circle as XCircle, Crosshair as CrosshairIcon, Hash, Layers, RotateCcw, Zap, Repeat, Gauge, Timer } from 'lucide-react'

type BarrierType = 'none' | 'single' | 'double' | 'digit' | 'tick' | 'multiplier' | 'accumulator'

interface TradeTypeOption {
  contractType: string
  side: 'up' | 'down' | 'touch' | 'notouch' | 'in' | 'out' | 'digit' | 'multiplier' | 'accumulator' | 'reset' | 'run' | 'tick' | 'turbos' | 'vanilla' | 'asian'
  displayName: string
  barrierType: BarrierType
}

const TRADE_TYPE_GROUPS: { group: string; types: TradeTypeOption[] }[] = [
  {
    group: 'Rise / Fall',
    types: [
      { contractType: 'CALL', side: 'up', displayName: 'Rise', barrierType: 'none' },
      { contractType: 'PUT', side: 'down', displayName: 'Fall', barrierType: 'none' },
      { contractType: 'CALLE', side: 'up', displayName: 'Rise (Daily)', barrierType: 'none' },
      { contractType: 'PUTE', side: 'down', displayName: 'Fall (Daily)', barrierType: 'none' },
    ],
  },
  {
    group: 'Higher / Lower',
    types: [
      { contractType: 'HIGHER', side: 'up', displayName: 'Higher', barrierType: 'single' },
      { contractType: 'LOWER', side: 'down', displayName: 'Lower', barrierType: 'single' },
    ],
  },
  {
    group: 'Touch / No Touch',
    types: [
      { contractType: 'ONETOUCH', side: 'touch', displayName: 'Touch', barrierType: 'single' },
      { contractType: 'NOTOUCH', side: 'notouch', displayName: 'No Touch', barrierType: 'single' },
    ],
  },
  {
    group: 'Ends In / Ends Out',
    types: [
      { contractType: 'EXPIRYRANGE', side: 'in', displayName: 'Ends In', barrierType: 'double' },
      { contractType: 'EXPIRYMISS', side: 'out', displayName: 'Ends Out', barrierType: 'double' },
      { contractType: 'EXPIRYRANGEE', side: 'in', displayName: 'Ends In (Daily)', barrierType: 'double' },
      { contractType: 'EXPIRYMISSE', side: 'out', displayName: 'Ends Out (Daily)', barrierType: 'double' },
    ],
  },
  {
    group: 'Stays In / Goes Out',
    types: [
      { contractType: 'RANGE', side: 'in', displayName: 'Stays In', barrierType: 'double' },
      { contractType: 'UPORDOWN', side: 'out', displayName: 'Goes Out', barrierType: 'double' },
    ],
  },
  {
    group: 'Digits',
    types: [
      { contractType: 'DIGITMATCH', side: 'digit', displayName: 'Matches', barrierType: 'digit' },
      { contractType: 'DIGITDIFF', side: 'digit', displayName: 'Differs', barrierType: 'digit' },
      { contractType: 'DIGITOVER', side: 'digit', displayName: 'Over', barrierType: 'digit' },
      { contractType: 'DIGITUNDER', side: 'digit', displayName: 'Under', barrierType: 'digit' },
      { contractType: 'DIGITODD', side: 'digit', displayName: 'Odd', barrierType: 'digit' },
      { contractType: 'DIGITEVEN', side: 'digit', displayName: 'Even', barrierType: 'digit' },
    ],
  },
  {
    group: 'Asians',
    types: [
      { contractType: 'ASIANU', side: 'asian', displayName: 'Asian Up', barrierType: 'none' },
      { contractType: 'ASIAND', side: 'asian', displayName: 'Asian Down', barrierType: 'none' },
    ],
  },
  {
    group: 'Multipliers',
    types: [
      { contractType: 'MULTUP', side: 'multiplier', displayName: 'Up', barrierType: 'multiplier' },
      { contractType: 'MULTDOWN', side: 'multiplier', displayName: 'Down', barrierType: 'multiplier' },
    ],
  },
  {
    group: 'Accumulators',
    types: [
      { contractType: 'ACCU', side: 'accumulator', displayName: 'Accumulator', barrierType: 'accumulator' },
    ],
  },
  {
    group: 'Reset',
    types: [
      { contractType: 'RESETCALL', side: 'reset', displayName: 'Reset Call', barrierType: 'none' },
      { contractType: 'RESETPUT', side: 'reset', displayName: 'Reset Put', barrierType: 'none' },
    ],
  },
  {
    group: 'Run High / Low',
    types: [
      { contractType: 'RUNHIGH', side: 'run', displayName: 'Run High', barrierType: 'none' },
      { contractType: 'RUNLOW', side: 'run', displayName: 'Run Low', barrierType: 'none' },
    ],
  },
  {
    group: 'Tick High / Low',
    types: [
      { contractType: 'TICKHIGH', side: 'tick', displayName: 'Tick High', barrierType: 'tick' },
      { contractType: 'TICKLOW', side: 'tick', displayName: 'Tick Low', barrierType: 'tick' },
    ],
  },
  {
    group: 'Turbos',
    types: [
      { contractType: 'TURBOSLONG', side: 'turbos', displayName: 'Long', barrierType: 'single' },
      { contractType: 'TURBOSSHORT', side: 'turbos', displayName: 'Short', barrierType: 'single' },
    ],
  },
  {
    group: 'Vanilla',
    types: [
      { contractType: 'VANILLALONGCALL', side: 'vanilla', displayName: 'Call', barrierType: 'single' },
      { contractType: 'VANILLALONGPUT', side: 'vanilla', displayName: 'Put', barrierType: 'single' },
    ],
  },
]

const ALL_TRADE_TYPES = TRADE_TYPE_GROUPS.flatMap((g) => g.types)

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
  const [digit, setDigit] = useState('5')
  const [selectedTick, setSelectedTick] = useState('5')
  const [cancellation, setCancellation] = useState('60')
  const [growthRate, setGrowthRate] = useState('1')
  const [takeProfit, setTakeProfit] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [availableContractTypes, setAvailableContractTypes] = useState<Set<string> | null>(null)
  const [contractDurationLimits, setContractDurationLimits] = useState<Record<string, { min: string; max: string; unit: string }>>({})
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

  // Fetch available contract types and duration limits for the selected symbol via contracts_for
  useEffect(() => {
    if (!selectedSymbol) return
    let cancelled = false
    setAvailableContractTypes(null)
    setContractDurationLimits({})

    const pubWs = new DerivWS(PUBLIC_WS_URL)
    pubWs.connect()
      .then(() => pubWs.send({ contracts_for: selectedSymbol }))
      .then((res) => {
        if (cancelled) return
        const available = res.contracts_for?.available
        if (available && Array.isArray(available)) {
          const types = new Set<string>()
          const limits: Record<string, { min: string; max: string; unit: string }> = {}
          for (const c of available) {
            if (c.contract_type) {
              types.add(c.contract_type)
              const minDur = String(c.min_contract_duration || '1')
              const maxDur = String(c.max_contract_duration || '365')
              const unit = minDur.match(/[a-z]$/i)?.[0]?.toLowerCase() || 't'
              limits[c.contract_type] = { min: minDur.replace(/[^0-9.]/g, ''), max: maxDur.replace(/[^0-9.]/g, ''), unit }
            }
          }
          setAvailableContractTypes(types)
          setContractDurationLimits(limits)
        }
      })
      .catch(() => {
        if (cancelled) return
        setAvailableContractTypes(null)
      })
      .finally(() => {
        if (!cancelled) pubWs.disconnect()
      })

    return () => {
      cancelled = true
      pubWs.disconnect()
    }
  }, [selectedSymbol])

  // When available types change, ensure selected type is still valid
  useEffect(() => {
    if (!availableContractTypes) return
    if (availableContractTypes.size === 0) return
    if (!availableContractTypes.has(selectedTradeType.contractType)) {
      const firstAvailable = ALL_TRADE_TYPES.find((t) => availableContractTypes.has(t.contractType))
      if (firstAvailable) setSelectedTradeType(firstAvailable)
    }
  }, [availableContractTypes, selectedTradeType])

  // Digit contracts require tick-based durations — auto-switch when a digit type is selected
  useEffect(() => {
    if (selectedTradeType.barrierType === 'digit' && durationUnit !== 't') {
      setDurationUnit('t')
      setDuration('5')
    }
  }, [selectedTradeType, durationUnit])

  // Tick High/Low contracts require tick-based durations
  useEffect(() => {
    if (selectedTradeType.barrierType === 'tick' && durationUnit !== 't') {
      setDurationUnit('t')
      setDuration('5')
    }
  }, [selectedTradeType, durationUnit])

  // Daily contracts (CALLE, PUTE, EXPIRYRANGEE, EXPIRYMISSE) use days as duration unit
  useEffect(() => {
    const dailyTypes = ['CALLE', 'PUTE', 'EXPIRYRANGEE', 'EXPIRYMISSE']
    if (dailyTypes.includes(selectedTradeType.contractType) && durationUnit !== 'd') {
      setDurationUnit('d')
      setDuration('1')
    }
  }, [selectedTradeType, durationUnit])

  // Multiplier contracts use minutes/hours durations, not ticks or days
  useEffect(() => {
    if (selectedTradeType.barrierType === 'multiplier' && (durationUnit === 't' || durationUnit === 'd')) {
      setDurationUnit('m')
      setDuration('5')
    }
  }, [selectedTradeType, durationUnit])

  // Accumulator contracts use ticks duration
  useEffect(() => {
    if (selectedTradeType.barrierType === 'accumulator' && durationUnit !== 't') {
      setDurationUnit('t')
      setDuration('10')
    }
  }, [selectedTradeType, durationUnit])

  // Enforce duration limits from contracts_for for the selected contract type
  useEffect(() => {
    const limits = contractDurationLimits[selectedTradeType.contractType]
    if (!limits) return
    const durNum = parseInt(duration) || 0
    const minNum = parseInt(limits.min) || 1
    const maxNum = parseInt(limits.max) || 365
    if (durNum < minNum) {
      setDuration(limits.min)
    } else if (durNum > maxNum) {
      setDuration(limits.max)
    }
  }, [contractDurationLimits, selectedTradeType, duration])

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

    const bt = selectedTradeType.barrierType
    if ((bt === 'single' && !barrier) || (bt === 'double' && (!barrierHigh || !barrierLow)) || (bt === 'tick' && !selectedTick)) {
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

    if (bt === 'single') {
      request.barrier = barrier
    } else if (bt === 'double') {
      request.barrier = `${barrierHigh}`
      request.barrier2 = `${barrierLow}`
    } else if (bt === 'digit') {
      request.barrier = digit
    } else if (bt === 'tick') {
      request.selected_tick = parseInt(selectedTick)
    } else if (bt === 'multiplier') {
      request.cancellation = cancellation
      const limitOrder: Record<string, number> = {}
      if (takeProfit) limitOrder.take_profit = parseFloat(takeProfit)
      if (stopLoss) limitOrder.stop_loss = parseFloat(stopLoss)
      if (Object.keys(limitOrder).length > 0) request.limit_order = limitOrder
    } else if (bt === 'accumulator') {
      request.growth_rate = parseFloat(growthRate)
      const limitOrder: Record<string, number> = {}
      if (takeProfit) limitOrder.take_profit = parseFloat(takeProfit)
      if (stopLoss) limitOrder.stop_loss = parseFloat(stopLoss)
      if (Object.keys(limitOrder).length > 0) request.limit_order = limitOrder
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
  }, [ws, selectedSymbol, account, stake, duration, durationUnit, selectedTradeType, barrier, barrierHigh, barrierLow, digit, selectedTick, cancellation, growthRate, takeProfit, stopLoss])

  const executeTrade = async () => {
    if (!ws || !account || !selectedSymbol) return

    setIsTrading(true)
    try {
      const bt = selectedTradeType.barrierType
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

      if (bt === 'single') {
        request.barrier = barrier
      } else if (bt === 'double') {
        request.barrier = `${barrierHigh}`
        request.barrier2 = `${barrierLow}`
      } else if (bt === 'digit') {
        request.barrier = digit
      } else if (bt === 'tick') {
        request.selected_tick = parseInt(selectedTick)
      } else if (bt === 'multiplier') {
        request.cancellation = cancellation
        const limitOrder: Record<string, number> = {}
        if (takeProfit) limitOrder.take_profit = parseFloat(takeProfit)
        if (stopLoss) limitOrder.stop_loss = parseFloat(stopLoss)
        if (Object.keys(limitOrder).length > 0) request.limit_order = limitOrder
      } else if (bt === 'accumulator') {
        request.growth_rate = parseFloat(growthRate)
        const limitOrder: Record<string, number> = {}
        if (takeProfit) limitOrder.take_profit = parseFloat(takeProfit)
        if (stopLoss) limitOrder.stop_loss = parseFloat(stopLoss)
        if (Object.keys(limitOrder).length > 0) request.limit_order = limitOrder
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

            {/* Digit Meter — shown for digit trade types */}
            {selectedTradeType.barrierType === 'digit' && (
              <DigitMeter ticks={ticks} selectedDigit={parseInt(digit)} contractType={selectedTradeType.contractType} />
            )}

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
                    {TRADE_TYPE_GROUPS.map((group) => {
                      const visibleTypes = group.types.filter(
                        (opt) => !availableContractTypes || availableContractTypes.has(opt.contractType),
                      )
                      if (visibleTypes.length === 0) return null
                      return (
                      <div key={group.group}>
                        <div className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide sticky top-0 bg-bg-secondary">
                          {group.group}
                        </div>
                        {visibleTypes.map((opt) => (
                          <button
                            key={`${opt.contractType}-${opt.side}`}
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
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Single barrier input */}
            {selectedTradeType.barrierType === 'single' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  {selectedTradeType.side === 'touch' ? 'Barrier (price target)' : 'Barrier (offset from spot)'}
                </label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={barrier}
                    onChange={(e) => setBarrier(e.target.value)}
                    placeholder={selectedTradeType.side === 'touch' ? 'e.g. 1.1050' : 'e.g. +0.50 or -0.50'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Digit barrier selector (0-9) */}
            {selectedTradeType.barrierType === 'digit' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Digit (0-9)</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <select
                    value={digit}
                    onChange={(e) => setDigit(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={String(i)}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tick selector for Tick High/Low contracts */}
            {selectedTradeType.barrierType === 'tick' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Selected Tick (1-10)</label>
                <div className="relative">
                  <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <select
                    value={selectedTick}
                    onChange={(e) => setSelectedTick(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={String(i + 1)}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-text-muted mt-1">Predict which tick (out of 10) will have the highest/lowest value.</p>
              </div>
            )}

            {/* Multiplier cancellation duration */}
            {selectedTradeType.barrierType === 'multiplier' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Cancellation (seconds)</label>
                <div className="relative">
                  <RotateCcw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="number"
                    value={cancellation}
                    onChange={(e) => setCancellation(e.target.value)}
                    min="15"
                    step="15"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-1">You can cancel the contract within this time window for a refund.</p>
              </div>
            )}

            {/* Accumulator growth rate */}
            {selectedTradeType.barrierType === 'accumulator' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Growth Rate (%)</label>
                <div className="relative">
                  <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="number"
                    value={growthRate}
                    onChange={(e) => setGrowthRate(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-1">The growth rate applied per tick for the accumulator contract.</p>
              </div>
            )}

            {/* Take Profit / Stop Loss for multiplier and accumulator contracts */}
            {(selectedTradeType.barrierType === 'multiplier' || selectedTradeType.barrierType === 'accumulator') && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Take Profit (optional)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="number"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      step="0.01"
                      placeholder="Auto-close at profit"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Stop Loss (optional)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="number"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      step="0.01"
                      placeholder="Auto-close at loss"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Double barriers for Ends In/Out and Stays In/Goes Out */}
            {selectedTradeType.barrierType === 'double' && (
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
                    min={contractDurationLimits[selectedTradeType.contractType]?.min || '1'}
                    max={contractDurationLimits[selectedTradeType.contractType]?.max}
                    className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm tabular focus:outline-none focus:border-brand-blue transition-colors"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    disabled={selectedTradeType.barrierType === 'digit' || selectedTradeType.barrierType === 'tick' || selectedTradeType.barrierType === 'accumulator'}
                    className="px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-light text-sm focus:outline-none focus:border-brand-blue transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="t">ticks</option>
                    <option value="s">sec</option>
                    <option value="m">min</option>
                    <option value="h">hrs</option>
                    <option value="d">days</option>
                  </select>
                </div>
                {contractDurationLimits[selectedTradeType.contractType] && (
                  <p className="text-[10px] text-text-muted mt-1">
                    {(selectedTradeType.barrierType === 'digit' || selectedTradeType.barrierType === 'tick' || selectedTradeType.barrierType === 'accumulator')
                      ? `Uses ticks only · ${contractDurationLimits[selectedTradeType.contractType].min}–${contractDurationLimits[selectedTradeType.contractType].max} ticks`
                      : `Min: ${contractDurationLimits[selectedTradeType.contractType].min} · Max: ${contractDurationLimits[selectedTradeType.contractType].max}`}
                  </p>
                )}
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
              disabled={isTrading || !selectedSymbol || loadingSymbols || currentSymbol?.exchange_is_open === 0 || !proposal || proposalLoading || (selectedTradeType.barrierType === 'tick' && !selectedTick)}
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
  const ct = contract.contract_type
  const isUp = ['CALL', 'CALLE', 'HIGHER', 'ONETOUCH', 'MULTUP', 'RESETCALL', 'RUNHIGH', 'TICKHIGH', 'TURBOSLONG', 'VANILLALONGCALL', 'ASIANU'].includes(ct)
  const isDown = ['PUT', 'PUTE', 'LOWER', 'NOTOUCH', 'MULTDOWN', 'RESETPUT', 'RUNLOW', 'TICKLOW', 'TURBOSSHORT', 'VANILLALONGPUT', 'ASIAND'].includes(ct)
  const isDigit = ct.startsWith('DIGIT')
  const isRange = ['EXPIRYRANGE', 'EXPIRYRANGEE', 'RANGE'].includes(ct)
  const profit = contract.profit
  const isProfit = profit >= 0
  const label = isUp ? 'UP' : isDown ? 'DOWN' : isDigit ? 'DIGIT' : isRange ? 'IN' : ct
  const tone = isUp || isRange ? 'green' : isDown ? 'red' : 'blue'

  return (
    <div className="rounded-xl bg-bg-tertiary border border-border-light p-3 slide-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center ${tone === 'green' ? 'bg-brand-green/15' : tone === 'red' ? 'bg-brand-red/15' : 'bg-brand-blue/15'}`}>
            {isUp ? <TrendingUp className="w-3.5 h-3.5 text-brand-green" /> : isDown ? <TrendingDown className="w-3.5 h-3.5 text-brand-red" /> : isDigit ? <Hash className="w-3.5 h-3.5 text-brand-blue" /> : <CrosshairIcon className="w-3.5 h-3.5 text-brand-blue" />}
          </div>
          <span className="text-sm font-medium">{contract.display_name || contract.symbol}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${tone === 'green' ? 'text-brand-green' : tone === 'red' ? 'text-brand-red' : 'text-brand-blue'}`}>
          {label}
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

function DigitMeter({ ticks, selectedDigit, contractType }: { ticks: Tick[]; selectedDigit: number; contractType: string }) {
  const lastTick = ticks.length > 0 ? ticks[ticks.length - 1] : null
  const lastDigit = lastTick ? Math.floor(Math.abs(lastTick.quote) * 10) % 10 : null

  const digitCounts = new Array(10).fill(0)
  for (const t of ticks) {
    const d = Math.floor(Math.abs(t.quote) * 10) % 10
    digitCounts[d]++
  }
  const maxCount = Math.max(...digitCounts, 1)

  const isMatchType = contractType === 'DIGITMATCH'
  const isDiffType = contractType === 'DIGITDIFF'
  const isOverType = contractType === 'DIGITOVER'
  const isUnderType = contractType === 'DIGITUNDER'
  const isOddType = contractType === 'DIGITODD'
  const isEvenType = contractType === 'DIGITEVEN'

  const isWinningDigit = (d: number): boolean => {
    if (isMatchType) return d === selectedDigit
    if (isDiffType) return d !== selectedDigit
    if (isOverType) return d > selectedDigit
    if (isUnderType) return d < selectedDigit
    if (isOddType) return d % 2 === 1
    if (isEvenType) return d % 2 === 0
    return false
  }

  return (
    <div className="mt-4 rounded-xl bg-bg-tertiary border border-border-light p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5" />
          Last Digit Meter
        </span>
        {lastDigit !== null && (
          <span className="text-xs text-text-muted">
            Current: <span className="font-bold tabular text-text-primary text-base">{lastDigit}</span>
          </span>
        )}
      </div>

      {/* Digits row with indicator */}
      <div className="relative">
        <div className="flex items-center justify-between gap-1">
          {Array.from({ length: 10 }, (_, d) => {
            const isCurrent = lastDigit === d
            const isWinning = isWinningDigit(d)
            const count = digitCounts[d]
            const barHeight = (count / maxCount) * 100
            return (
              <div key={d} className="flex-1 flex flex-col items-center gap-1.5 relative">
                {/* Frequency bar */}
                <div className="w-full h-16 flex items-end justify-center">
                  <div
                    className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                      isCurrent ? 'bg-brand-blue' : 'bg-border-light'
                    }`}
                    style={{ height: `${Math.max(barHeight, 3)}%`, opacity: isCurrent ? 1 : 0.5 }}
                  />
                </div>
                {/* Digit circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold tabular transition-all duration-300 ${
                    isCurrent
                      ? 'bg-brand-blue text-white scale-110 shadow-lg shadow-brand-blue/30'
                      : isWinning
                      ? 'bg-brand-green/15 text-brand-green border border-brand-green/40'
                      : 'bg-bg-secondary text-text-secondary border border-border-light'
                  }`}
                >
                  {d}
                </div>
                {/* Count */}
                <span className={`text-[10px] tabular ${isCurrent ? 'text-brand-blue font-semibold' : 'text-text-muted'}`}>
                  {count}
                </span>
              </div>
            )
          })}
        </div>

        {/* Moving indicator arrow above the current digit */}
        {lastDigit !== null && (
          <div
            className="absolute -top-1 transition-all duration-300 ease-out"
            style={{
              left: `calc(${(lastDigit / 9) * 100}% )`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex flex-col items-center">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-brand-blue" />
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-blue" /> Current digit
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-green/30 border border-brand-green/50" /> Winning digits
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-6 rounded-sm bg-border-light" /> Frequency
        </span>
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
  if (side === 'out') return <CrosshairIcon className="w-4 h-4 text-brand-red" />
  if (side === 'digit') return <Hash className="w-4 h-4 text-brand-blue" />
  if (side === 'multiplier') return <Layers className="w-4 h-4 text-brand-green" />
  if (side === 'accumulator') return <Zap className="w-4 h-4 text-brand-amber" />
  if (side === 'reset') return <RotateCcw className="w-4 h-4 text-brand-blue" />
  if (side === 'run') return <Gauge className="w-4 h-4 text-brand-green" />
  if (side === 'tick') return <Timer className="w-4 h-4 text-brand-blue" />
  if (side === 'turbos') return <Zap className="w-4 h-4 text-brand-green" />
  if (side === 'vanilla') return <Repeat className="w-4 h-4 text-brand-blue" />
  if (side === 'asian') return <Activity className="w-4 h-4 text-brand-amber" />
  return <CrosshairIcon className="w-4 h-4 text-brand-red" />
}
