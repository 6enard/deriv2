import type { DerivWS } from '../lib/deriv-ws'
import type { DerivSessionAccount } from '../lib/types'
import type { TradeParams } from './index'

export type NotificationType =
  | 'success'
  | 'info'
  | 'warn'
  | 'error'

export interface NotifyData {
  event?:
    | 'trade_won'
    | 'trade_lost'
    | 'trade_sold'
    | 'purchase'
    | 'proposal'
    | 'error'
    | 'info'

  contractId?: number
  profit?: number
  stake?: number
  payout?: number
  contractType?: string
}

export interface BotApi {
  purchase(
    contractType?: string,
  ): Promise<number>

  sellAtMarket(): Promise<void>

  isContractOpen(): boolean
  isSellAvailable(): boolean

  getAskPrice(): number
  getPayout(): number
  getSellPrice(): number

  getTick(): number
  getTicks(): number[]
  getLastDigit(): number
  getLastDigitList(): number[]
  getDirection(): string

  getOHLC(
    index?: number,
    interval?: string | number,
  ): Promise<Record<string, number>>

  getOHLCValues(
    field?: string,
    interval?: string | number,
  ): Promise<number[]>

  readOHLC(
    field: string,
    index?: number,
    interval?: string | number,
  ): Promise<number>

  readOHLCObject(
    candle: unknown,
    field: string,
  ): number

  isCandleBlack(
    candle: unknown,
  ): boolean

  getCurrentCandleTime(
    interval?: string | number,
  ): Promise<number>

  isNewCandle(
    interval?: string | number,
  ): Promise<boolean>

  getSMA(
    field?: string,
    interval?: string | number,
    period?: number,
  ): Promise<number>

  getSMAArray(
    field?: string,
    interval?: string | number,
    period?: number,
  ): Promise<number[]>

  getEMA(
    field?: string,
    interval?: string | number,
    period?: number,
  ): Promise<number>

  getEMAArray(
    field?: string,
    interval?: string | number,
    period?: number,
  ): Promise<number[]>

  getRSI(
    field?: string,
    interval?: string | number,
    period?: number,
  ): Promise<number>

  getRSIArray(
    field?: string,
    interval?: string | number,
    period?: number,
  ): Promise<number[]>

  getBollingerBands(
    field?: string,
    interval?: string | number,
    period?: number,
    multiplierUp?: number,
    multiplierDown?: number,
  ): Promise<{
    middle: number
    upper: number
    lower: number
  }>

  getBollingerBandsArray(
    field?: string,
    interval?: string | number,
    period?: number,
    multiplierUp?: number,
    multiplierDown?: number,
  ): Promise<Array<{
    middle: number
    upper: number
    lower: number
  }>>

  getMACDArray(
    field?: string,
    interval?: string | number,
    fastPeriod?: number,
    slowPeriod?: number,
    signalPeriod?: number,
  ): Promise<Array<{
    macd: number
    signal: number
    histogram: number
  }>>

  getBalance(): number
  getLastResult(): string
  getDetails(
    detail: string,
  ): string | number

  getTotalProfit(): number
  getTotalRuns(): number

  setStake(amount: number): void
  getStake(): number

  setBarrier(
    barrier: string | number,
  ): void

  getBarrier(): string

  shouldStop(): boolean

  notify(
    type: NotificationType,
    message: string,
    data?: NotifyData,
  ): void

  console(
    type: string,
    message: unknown,
  ): void

  sleep(ms: number): Promise<void>

  tickDelay(
    count: number,
  ): Promise<void>

  /*
   * Forgets any active tick/contract
   * subscriptions for this BotApi instance.
   * Callers MUST call this once a run has
   * finished or been stopped, otherwise the
   * next run's subscribe() call for the same
   * symbol will be rejected by the API with
   * an "AlreadySubscribed" error.
   */
  cleanup(): Promise<void>
}

export interface BotApiOptions {
  onNotify?: (
    type: NotificationType,
    message: string,
    data?: NotifyData,
  ) => void

  onTrade?: (
    contractId: number,
  ) => void

  shouldStop?: () => boolean
}

function number(
  value: unknown,
  fallback = 0,
): number {
  const parsed =
    Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : fallback
}

function isBarrierContract(
  contractType: string,
): boolean {
  return [
    'DIGITMATCH',
    'DIGITDIFF',
    'DIGITOVER',
    'DIGITUNDER',
    'DIGITEVEN',
    'DIGITODD',
    'CALL',
    'PUT',
    'HIGHER',
    'LOWER',
    'TOUCH',
    'NOTOUCH',
    'ONETOUCH',
    'IN',
    'OUT',
    'EXPIRYRANGE',
    'EXPIRYMISS',
    'RANGE',
    'UPORDOWN',
  ].includes(contractType)
}

function decimalPlaces(
  value: number,
): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const text =
    String(value)

  if (!text.includes('.')) {
    return 0
  }

  return text.split('.')[1]
    .length
}

function getLastDigitFromQuote(
  quote: number,
): number {
  if (!Number.isFinite(quote)) {
    return 0
  }

  const places =
    decimalPlaces(quote)

  if (places <= 0) {
    return (
      Math.abs(
        Math.trunc(quote),
      ) % 10
    )
  }

  const multiplier =
    Math.pow(10, places)

  const integerValue =
    Math.round(
      Math.abs(quote) *
        multiplier,
    )

  return (
    integerValue % 10
  )
}

export function createBotApi(
  ws: DerivWS,
  account: DerivSessionAccount,
  params: TradeParams,
  options: BotApiOptions = {},
): BotApi {
  let currentStake =
    number(params.amount, 0)

  let currentContractType =
    String(
      params.contract_type ||
        '',
    ).toUpperCase()

  let currentBarrier =
    params.barrier !==
        undefined &&
      params.barrier !==
        null
      ? String(params.barrier)
      : params.prediction !==
            undefined &&
          params.prediction !==
            null
        ? String(
            params.prediction,
          )
        : ''

  let openContractId:
    number | null = null

  let lastResult = ''
  let lastProfit = 0
  let lastBuyPrice = 0
  let lastPayout = 0
  let lastAskPrice = 0

  let totalRuns = 0
  let totalProfit = 0

  const tickHistory: number[] =
    []

  let tickSubscriptionId:
    string | null = null

  let contractSubscriptionId:
    string | null = null

  let disposed = false

  const shouldStop =
    options.shouldStop ||
    function (): boolean {
      return false
    }

  /* =======================================================
  NOTIFICATIONS
  ======================================================= */

  function notify(
    type: NotificationType,
    message: string,
    data?: NotifyData,
  ): void {
    if (options.onNotify) {
      options.onNotify(
        type,
        message,
        data,
      )
    }
  }

  function writeConsole(
    type: string,
    message: unknown,
  ): void {
    if (type === 'error') {
      console.error(message)
    } else if (
      type === 'warn'
    ) {
      console.warn(message)
    } else {
      console.log(message)
    }

    notify(
      type === 'error'
        ? 'error'
        : type === 'warn'
          ? 'warn'
          : 'info',
      String(message),
    )
  }

  /* =======================================================
  SUBSCRIPTION CLEANUP
  ======================================================= */

  async function forgetSubscription(
    subscriptionId:
      | string
      | null,
  ): Promise<void> {
    if (!subscriptionId) {
      return
    }

    try {
      await ws.forget(
        subscriptionId,
      )
    } catch {
      // Subscription may already be gone.
    }
  }

  async function cleanupSubscriptions(): Promise<void> {
    const tickId =
      tickSubscriptionId

    const contractId =
      contractSubscriptionId

    tickSubscriptionId = null
    contractSubscriptionId = null

    await Promise.all([
      forgetSubscription(
        tickId,
      ),
      forgetSubscription(
        contractId,
      ),
    ])
  }

  /* =======================================================
  TICK STREAM
  ======================================================= */

  async function startTickStream(): Promise<void> {
    if (disposed) {
      return
    }

    /*
     * Do not create another stream if one is
     * already active for this BotApi instance.
     */
    if (tickSubscriptionId) {
      return
    }

    try {
      const result =
        await ws.subscribe(
          {
            ticks: params.symbol,
          },
          (
            data: any,
          ) => {
            if (
              disposed ||
              !data?.tick
            ) {
              return
            }

            const quote =
              number(
                data.tick.quote,
                NaN,
              )

            if (
              !Number.isFinite(
                quote,
              )
            ) {
              return
            }

            tickHistory.push(
              quote,
            )

            if (
              tickHistory.length >
              100
            ) {
              tickHistory.shift()
            }
          },
        )

      const id =
        result.data?.subscription
          ?.id

      if (id) {
        tickSubscriptionId =
          String(id)
      }

      notify(
        'info',
        'Tick stream connected for ' +
          params.symbol,
        {
          event: 'info',
        },
      )
    } catch (error) {
      writeConsole(
        'warn',
        'Unable to subscribe to ticks.',
      )

      writeConsole(
        'warn',
        error,
      )

      throw error
    }
  }


  /* =======================================================
  CANDLE / INDICATOR DATA
  ======================================================= */

  const candleCache =
    new Map<
      string,
      Array<Record<string, number>>
    >()

  const candleTimeCache =
    new Map<string, number>()

  function granularityFromInterval(
    interval?: string | number,
  ): number {
    const raw =
      interval === undefined ||
      interval === null ||
      String(interval) === '' ||
      String(interval) === 'default'
        ? params.candle_interval
        : interval

    const value = number(raw, 60)

    return Math.max(
      60,
      Math.floor(value),
    )
  }

  function normalizeCandle(
    candle: any,
  ): Record<string, number> {
    return {
      epoch: number(candle?.epoch, 0),
      open: number(candle?.open, 0),
      high: number(candle?.high, 0),
      low: number(candle?.low, 0),
      close: number(candle?.close, 0),
    }
  }

  async function fetchOHLC(
    interval?: string | number,
  ): Promise<Array<Record<string, number>>> {
    const granularity =
      granularityFromInterval(interval)

    const cacheKey =
      String(granularity)

    const response =
      await ws.send({
        ticks_history:
          params.symbol,
        end: 'latest',
        count: 200,
        style: 'candles',
        granularity,
      })

    if (response?.error) {
      throw new Error(
        response.error.message ||
          'Unable to retrieve candle history.',
      )
    }

    const candles =
      Array.isArray(
        response?.candles,
      )
        ? response.candles.map(
            normalizeCandle,
          )
        : []

    if (!candles.length) {
      throw new Error(
        'Deriv returned no candle data.',
      )
    }

    candleCache.set(
      cacheKey,
      candles,
    )

    return candles
  }

  async function getCandleHistory(
    interval?: string | number,
  ): Promise<Array<Record<string, number>>> {
    const granularity =
      granularityFromInterval(interval)

    const cacheKey =
      String(granularity)

    const cached =
      candleCache.get(cacheKey)

    if (
      cached &&
      cached.length
    ) {
      try {
        return await fetchOHLC(
          granularity,
        )
      } catch {
        return cached.slice()
      }
    }

    return fetchOHLC(
      granularity,
    )
  }

  function candleIndexValue(
    index: number,
    candles: Array<Record<string, number>>,
  ): Record<string, number> {
    const normalized =
      Math.max(
        1,
        Math.floor(
          number(index, 1),
        ),
      )

    const position =
      candles.length -
      normalized

    if (
      position < 0
    ) {
      return candles[0] || {
        epoch: 0,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
      }
    }

    return (
      candles[position] ||
      candles[candles.length - 1]
    )
  }

  async function getOHLC(
    index = 1,
    interval?: string | number,
  ): Promise<Record<string, number>> {
    const candles =
      await getCandleHistory(
        interval,
      )

    return candleIndexValue(
      index,
      candles,
    )
  }

  async function getOHLCValues(
    field = 'close',
    interval?: string | number,
  ): Promise<number[]> {
    const candles =
      await getCandleHistory(
        interval,
      )

    const key =
      ['open', 'high', 'low', 'close', 'epoch'].includes(
        String(field).toLowerCase(),
      )
        ? String(field).toLowerCase()
        : 'close'

    return candles.map(
      (candle) =>
        number(
          candle[key],
          0,
        ),
    )
  }

  async function readOHLC(
    field: string,
    index = 1,
    interval?: string | number,
  ): Promise<number> {
    const candle =
      await getOHLC(
        index,
        interval,
      )

    return readOHLCObject(
      candle,
      field,
    )
  }

  function readOHLCObject(
    candle: unknown,
    field: string,
  ): number {
    if (
      !candle ||
      typeof candle !== 'object'
    ) {
      return 0
    }

    const key =
      String(field)
        .toLowerCase()

    const value =
      (candle as Record<string, unknown>)[
        key
      ]

    return number(
      value,
      0,
    )
  }

  function isCandleBlack(
    candle: unknown,
  ): boolean {
    return (
      readOHLCObject(
        candle,
        'close',
      ) <
      readOHLCObject(
        candle,
        'open',
      )
    )
  }

  async function getCurrentCandleTime(
    interval?: string | number,
  ): Promise<number> {
    const candle =
      await getOHLC(
        1,
        interval,
      )

    return number(
      candle.epoch,
      0,
    )
  }

  async function isNewCandle(
    interval?: string | number,
  ): Promise<boolean> {
    const current =
      await getCurrentCandleTime(
        interval,
      )

    const key =
      String(
        granularityFromInterval(
          interval,
        ),
      )

    const previous =
      candleTimeCache.get(key)

    candleTimeCache.set(
      key,
      current,
    )

    return (
      previous !== undefined &&
      previous !== current
    )
  }

  function rollingSMA(
    values: number[],
    period: number,
  ): number[] {
    const p =
      Math.max(
        1,
        Math.floor(
          number(period, 14),
        ),
      )

    const result: number[] = []
    let sum = 0

    for (
      let i = 0;
      i < values.length;
      i += 1
    ) {
      sum += values[i]

      if (i >= p) {
        sum -= values[i - p]
      }

      result.push(
        sum /
          Math.min(
            i + 1,
            p,
          ),
      )
    }

    return result
  }

  function rollingEMA(
    values: number[],
    period: number,
  ): number[] {
    const p =
      Math.max(
        1,
        Math.floor(
          number(period, 14),
        ),
      )

    if (!values.length) {
      return []
    }

    const alpha =
      2 / (p + 1)

    const result =
      new Array<number>(
        values.length,
      )

    result[0] =
      values[0]

    for (
      let i = 1;
      i < values.length;
      i += 1
    ) {
      result[i] =
        alpha * values[i] +
        (1 - alpha) *
          result[i - 1]
    }

    return result
  }

  function rollingRSI(
    values: number[],
    period: number,
  ): number[] {
    const p =
      Math.max(
        1,
        Math.floor(
          number(period, 14),
        ),
      )

    if (values.length < 2) {
      return values.map(
        () => 50,
      )
    }

    const result =
      new Array<number>(
        values.length,
      )

    result[0] = 50

    let gain = 0
    let loss = 0

    for (
      let i = 1;
      i < values.length;
      i += 1
    ) {
      const delta =
        values[i] -
        values[i - 1]

      const currentGain =
        Math.max(
          delta,
          0,
        )

      const currentLoss =
        Math.max(
          -delta,
          0,
        )

      if (i <= p) {
        gain += currentGain
        loss += currentLoss
      } else {
        gain =
          (gain * (p - 1) +
            currentGain) /
          p

        loss =
          (loss * (p - 1) +
            currentLoss) /
          p
      }

      if (loss === 0) {
        result[i] =
          gain === 0
            ? 50
            : 100
      } else {
        const rs =
          gain / loss

        result[i] =
          100 -
          100 / (1 + rs)
      }
    }

    return result
  }

  async function getSMAArray(
    field = 'close',
    interval?: string | number,
    period = 14,
  ): Promise<number[]> {
    const values =
      await getOHLCValues(
        field,
        interval,
      )

    return rollingSMA(
      values,
      period,
    )
  }

  async function getSMA(
    field = 'close',
    interval?: string | number,
    period = 14,
  ): Promise<number> {
    const values =
      await getSMAArray(
        field,
        interval,
        period,
      )

    return values[
      values.length - 1
    ] || 0
  }

  async function getEMAArray(
    field = 'close',
    interval?: string | number,
    period = 14,
  ): Promise<number[]> {
    const values =
      await getOHLCValues(
        field,
        interval,
      )

    return rollingEMA(
      values,
      period,
    )
  }

  async function getEMA(
    field = 'close',
    interval?: string | number,
    period = 14,
  ): Promise<number> {
    const values =
      await getEMAArray(
        field,
        interval,
        period,
      )

    return values[
      values.length - 1
    ] || 0
  }

  async function getRSIArray(
    field = 'close',
    interval?: string | number,
    period = 14,
  ): Promise<number[]> {
    const values =
      await getOHLCValues(
        field,
        interval,
      )

    return rollingRSI(
      values,
      period,
    )
  }

  async function getRSI(
    field = 'close',
    interval?: string | number,
    period = 14,
  ): Promise<number> {
    const values =
      await getRSIArray(
        field,
        interval,
        period,
      )

    return values[
      values.length - 1
    ] || 0
  }

  async function getBollingerBandsArray(
    field = 'close',
    interval?: string | number,
    period = 20,
    multiplierUp = 2,
    multiplierDown = 2,
  ): Promise<Array<{
    middle: number
    upper: number
    lower: number
  }>> {
    const values =
      await getOHLCValues(
        field,
        interval,
      )

    const p =
      Math.max(
        1,
        Math.floor(
          number(period, 20),
        ),
      )

    const up =
      number(
        multiplierUp,
        2,
      )

    const down =
      number(
        multiplierDown,
        2,
      )

    const result:
      Array<{
        middle: number
        upper: number
        lower: number
      }> = []

    for (
      let i = 0;
      i < values.length;
      i += 1
    ) {
      const start =
        Math.max(
          0,
          i - p + 1,
        )

      const window =
        values.slice(
          start,
          i + 1,
        )

      const middle =
        window.reduce(
          (sum, value) =>
            sum + value,
          0,
        ) / window.length

      const variance =
        window.reduce(
          (sum, value) =>
            sum +
            Math.pow(
              value - middle,
              2,
            ),
          0,
        ) / window.length

      const deviation =
        Math.sqrt(
          variance,
        )

      result.push({
        middle,
        upper:
          middle +
          up * deviation,
        lower:
          middle -
          down * deviation,
      })
    }

    return result
  }

  async function getBollingerBands(
    field = 'close',
    interval?: string | number,
    period = 20,
    multiplierUp = 2,
    multiplierDown = 2,
  ): Promise<{
    middle: number
    upper: number
    lower: number
  }> {
    const values =
      await getBollingerBandsArray(
        field,
        interval,
        period,
        multiplierUp,
        multiplierDown,
      )

    return (
      values[
        values.length - 1
      ] || {
        middle: 0,
        upper: 0,
        lower: 0,
      }
    )
  }

  async function getMACDArray(
    field = 'close',
    interval?: string | number,
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9,
  ): Promise<Array<{
    macd: number
    signal: number
    histogram: number
  }>> {
    const values =
      await getOHLCValues(
        field,
        interval,
      )

    const fast =
      rollingEMA(
        values,
        fastPeriod,
      )

    const slow =
      rollingEMA(
        values,
        slowPeriod,
      )

    const macdLine =
      values.map(
        (_, index) =>
          fast[index] -
          slow[index],
      )

    const signal =
      rollingEMA(
        macdLine,
        signalPeriod,
      )

    return macdLine.map(
      (macd, index) => ({
        macd,
        signal:
          signal[index] || 0,
        histogram:
          macd -
          (signal[index] || 0),
      }),
    )
  }

  /* =======================================================
  CONTRACT SETTLEMENT
  ======================================================= */

  function handleSettlement(
    contract: any,
  ): void {
    if (!contract) {
      return
    }

    const contractId =
      number(
        contract.contract_id,
        0,
      )

    const status =
      String(
        contract.status || '',
      ).toLowerCase()

    const isSold =
      contract.is_sold === 1 ||
      status === 'sold' ||
      status === 'won' ||
      status === 'lost'

    if (!isSold) {
      return
    }

    const profit =
      number(
        contract.profit,
        0,
      )

    const buyPrice =
      number(
        contract.buy_price,
        lastBuyPrice,
      )

    const payout =
      number(
        contract.payout,
        lastPayout,
      )

    lastProfit =
      profit

    lastBuyPrice =
      buyPrice

    lastPayout =
      payout

    const result =
      profit > 0
        ? 'win'
        : profit < 0
          ? 'loss'
          : 'sold'

    lastResult =
      result

    totalProfit +=
      profit

    totalRuns +=
      1

    if (
      openContractId ===
      contractId
    ) {
      openContractId =
        null
    }

    const subscriptionId =
      contractSubscriptionId

    contractSubscriptionId =
      null

    void forgetSubscription(
      subscriptionId,
    )

    const event =
      result === 'win'
        ? 'trade_won'
        : result === 'loss'
          ? 'trade_lost'
          : 'trade_sold'

    notify(
      result === 'win'
        ? 'success'
        : result === 'loss'
          ? 'error'
          : 'info',
      'Contract settled: ' +
        result +
        ' (' +
        profit +
        ')',
      {
        event,
        contractId,
        profit,
        stake: buyPrice,
        payout,
        contractType:
          String(
            contract.contract_type ||
              currentContractType,
          ),
      },
    )
  }

  async function waitForContractSettlement(
    contractId: number,
  ): Promise<void> {
    const timeoutMs =
      120000

    const started =
      Date.now()

    try {
      const result =
        await ws.subscribe(
          {
            proposal_open_contract: 1,
            contract_id:
              contractId,
          },
          (
            data: any,
          ) => {
            const contract =
              data?.proposal_open_contract

            if (contract) {
              handleSettlement(
                contract,
              )
            }
          },
        )

      const subscriptionId =
        result.data?.subscription
          ?.id

      if (subscriptionId) {
        contractSubscriptionId =
          String(
            subscriptionId,
          )
      }

      /*
       * The initial response may already
       * contain the final state.
       */
      if (
        result.data
          ?.proposal_open_contract
      ) {
        handleSettlement(
          result.data
            .proposal_open_contract,
        )
      }
    } catch (error) {
      writeConsole(
        'warn',
        'Contract subscription failed; using polling fallback.',
      )

      /*
       * Polling fallback.
       */
      while (
        openContractId !==
          null &&
        openContractId ===
          contractId &&
        Date.now() -
            started <
          timeoutMs
      ) {
        if (
          shouldStop()
        ) {
          return
        }

        try {
          const response =
            await ws.send({
              proposal_open_contract:
                1,
              contract_id:
                contractId,
            })

          if (
            response
              ?.proposal_open_contract
          ) {
            handleSettlement(
              response.proposal_open_contract,
            )
          }
        } catch (pollError) {
          writeConsole(
            'warn',
            'Unable to read contract status.',
          )
        }

        if (
          openContractId ===
          null
        ) {
          return
        }

        await sleep(1000)
      }
    }

    while (
      openContractId ===
        contractId &&
      Date.now() -
          started <
        timeoutMs
    ) {
      if (
        shouldStop()
      ) {
        return
      }

      await sleep(250)

      if (
        openContractId ===
        null
      ) {
        return
      }
    }

    if (
      openContractId ===
      contractId
    ) {
      notify(
        'warn',
        'Contract settlement timed out.',
        {
          event: 'info',
          contractId,
        },
      )
    }
  }

  /* =======================================================
  PURCHASE
  ======================================================= */

  async function purchase(
    contractType?: string,
  ): Promise<number> {
    if (
      shouldStop()
    ) {
      throw new Error(
        'Bot stop requested.',
      )
    }

    /*
     * Make sure tick stream exists before
     * the first purchase.
     */
    await startTickStream()

    const ct =
      String(
        contractType ||
          currentContractType ||
          params.contract_type ||
          '',
      ).toUpperCase()

    if (!ct) {
      throw new Error(
        'No contract type was provided.',
      )
    }

    currentContractType =
      ct

    const stake =
      number(
        currentStake,
        0,
      )

    if (
      !Number.isFinite(
        stake,
      ) ||
      stake <= 0
    ) {
      throw new Error(
        'Invalid stake amount: ' +
          String(
            currentStake,
          ),
      )
    }

    const proposalRequest:
      Record<string, unknown> =
      {
        proposal: 1,
        amount: stake,
        basis: 'stake',
        contract_type:
          ct,
        currency:
          params.currency ||
          account.currency,
        duration:
          number(
            params.duration,
            1,
          ),
        duration_unit:
          params.duration_unit ||
          't',
        underlying_symbol:
          params.symbol,
      }

    if (
      isBarrierContract(ct) &&
      currentBarrier !== ''
    ) {
      proposalRequest.barrier =
        currentBarrier
    }

    if (
      params.second_barrier !==
        undefined &&
      params.second_barrier !==
        null &&
      String(
        params.second_barrier,
      ) !== ''
    ) {
      proposalRequest.barrier2 =
        String(
          params.second_barrier,
        )
    }

    let lastError:
      unknown = null

    for (
      let attempt = 1;
      attempt <= 3;
      attempt += 1
    ) {
      try {
        if (
          shouldStop()
        ) {
          throw new Error(
            'Bot stop requested.',
          )
        }

        notify(
          'info',
          'Requesting proposal for ' +
            ct +
            ' with stake ' +
            stake,
          {
            event:
              'proposal',
            stake,
            contractType:
              ct,
          },
        )

        const proposalResponse =
          await ws.send(
            proposalRequest,
          )

        if (
          proposalResponse
            ?.error
        ) {
          throw new Error(
            proposalResponse
              .error
              .message ||
              'Proposal request failed.',
          )
        }

        const proposal =
          proposalResponse
            ?.proposal

        if (!proposal) {
          throw new Error(
            'Deriv returned no proposal.',
          )
        }

        const proposalId =
          String(
            proposal.id ||
              '',
          )

        if (!proposalId) {
          throw new Error(
            'Deriv proposal has no id.',
          )
        }

        lastAskPrice =
          number(
            proposal.ask_price,
            stake,
          )

        lastPayout =
          number(
            proposal.payout,
            0,
          )

        /*
         * Buy the proposal.
         */
        const buyResponse =
          await ws.send({
            buy:
              proposalId,
            price:
              lastAskPrice,
          })

        if (
          buyResponse
            ?.error
        ) {
          throw new Error(
            buyResponse
              .error
              .message ||
              'Buy request failed.',
          )
        }

        const buy =
          buyResponse?.buy

        if (!buy) {
          throw new Error(
            'Deriv returned no buy response.',
          )
        }

        const contractId =
          number(
            buy.contract_id,
            0,
          )

        if (!contractId) {
          throw new Error(
            'Deriv returned no contract id.',
          )
        }

        openContractId =
          contractId

        lastBuyPrice =
          number(
            buy.buy_price,
            lastAskPrice,
          )

        if (
          buy.payout !==
          undefined
        ) {
          lastPayout =
            number(
              buy.payout,
              lastPayout,
            )
        }

        notify(
          'success',
          'Contract purchased: ' +
            contractId,
          {
            event:
              'purchase',
            contractId,
            stake,
            payout:
              lastPayout,
            contractType:
              ct,
          },
        )

        if (
          options.onTrade
        ) {
          options.onTrade(
            contractId,
          )
        }

        /*
         * Wait until the contract actually
         * settles before returning from
         * Bot.purchase().
         */
        await waitForContractSettlement(
          contractId,
        )

        return contractId
      } catch (
        error
      ) {
        lastError =
          error

        writeConsole(
          'error',
          error,
        )

        if (
          attempt < 3
        ) {
          await sleep(
            attempt * 1000,
          )
        }
      }
    }

    throw (
      lastError instanceof
      Error
        ? lastError
        : new Error(
            'Unable to purchase contract.',
          )
    )
  }

  /* =======================================================
  SELL
  ======================================================= */

  async function sellAtMarket(): Promise<void> {
    if (
      openContractId ===
      null
    ) {
      throw new Error(
        'There is no open contract to sell.',
      )
    }

    const contractId =
      openContractId

    const response =
      await ws.send({
        sell:
          contractId,
        price: 0,
      })

    if (
      response?.error
    ) {
      throw new Error(
        response.error
          .message ||
          'Unable to sell contract.',
      )
    }

    notify(
      'success',
      'Contract sold: ' +
        contractId,
      {
        event:
          'trade_sold',
        contractId,
        profit:
          number(
            response.sell
              ?.profit,
            0,
          ),
        stake:
          lastBuyPrice,
        payout:
          lastPayout,
        contractType:
          currentContractType,
      },
    )
  }

  /* =======================================================
  CONTRACT / MARKET DATA
  ======================================================= */

  function isContractOpen(): boolean {
    return (
      openContractId !==
      null
    )
  }

  function isSellAvailable(): boolean {
    return (
      openContractId !==
      null
    )
  }

  function getAskPrice(): number {
    return lastAskPrice
  }

  function getPayout(): number {
    return lastPayout
  }

  function getSellPrice(): number {
    return lastPayout
  }

  function getTick(): number {
    if (
      tickHistory.length ===
      0
    ) {
      return 0
    }

    return tickHistory[
      tickHistory.length - 1
    ]
  }

  function getTicks(): number[] {
    return tickHistory.slice()
  }

  function getLastDigit(): number {
    return getLastDigitFromQuote(
      getTick(),
    )
  }

  function getLastDigitList(): number[] {
    return tickHistory.map(
      getLastDigitFromQuote,
    )
  }

  function getDirection(): string {
    if (
      tickHistory.length <
      2
    ) {
      return ''
    }

    const current =
      tickHistory[
        tickHistory.length - 1
      ]

    const previous =
      tickHistory[
        tickHistory.length - 2
      ]

    if (
      current >
      previous
    ) {
      return 'up'
    }

    if (
      current <
      previous
    ) {
      return 'down'
    }

    return 'same'
  }

  function getBalance(): number {
    return number(
      account.balance,
      0,
    )
  }

  function getLastResult(): string {
    return lastResult
  }

  function getDetails(
    detail: string,
  ): string | number {
    const normalized =
      String(detail)
        .toLowerCase()
        .replace(
          /\s+/g,
          '_',
        )

    switch (
      normalized
    ) {
      case 'profit':
      case 'last_profit':
        return lastProfit

      case 'buy_price':
        return lastBuyPrice

      case 'ask_price':
        return lastAskPrice

      case 'payout':
        return lastPayout

      case 'result':
      case 'last_result':
        return lastResult

      case 'contract_id':
        return (
          openContractId ||
          0
        )

      case 'stake':
      case 'amount':
        return currentStake

      case 'barrier':
      case 'prediction':
        return currentBarrier

      case 'total_profit':
        return totalProfit

      case 'total_runs':
        return totalRuns

      case 'balance':
        return getBalance()

      case 'last_digit':
        return getLastDigit()

      case 'tick':
      case 'quote':
        return getTick()

      default:
        return ''
    }
  }

  function getTotalProfit(): number {
    return totalProfit
  }

  function getTotalRuns(): number {
    return totalRuns
  }

  /* =======================================================
  STAKE / BARRIER
  ======================================================= */

  function setStake(
    amount: number,
  ): void {
    const value =
      number(
        amount,
        NaN,
      )

    if (
      !Number.isFinite(
        value,
      ) ||
      value <= 0
    ) {
      throw new Error(
        'Stake must be greater than zero.',
      )
    }

    currentStake =
      value
  }

  function getStake(): number {
    return currentStake
  }

  function setBarrier(
    barrier:
      | string
      | number,
  ): void {
    currentBarrier =
      String(barrier)
  }

  function getBarrier(): string {
    return currentBarrier
  }

  /* =======================================================
  TIMING
  ======================================================= */

  function sleep(
    ms: number,
  ): Promise<void> {
    const delay =
      Math.max(
        0,
        number(ms, 0),
      )

    return new Promise(
      (resolve) => {
        setTimeout(
          resolve,
          delay,
        )
      },
    )
  }

  async function tickDelay(
    count: number,
  ): Promise<void> {
    const target =
      Math.max(
        1,
        Math.floor(
          number(
            count,
            1,
          ),
        ),
      )

    /*
     * Make sure there is a tick stream.
     */
    await startTickStream()

    const startingLength =
      tickHistory.length

    const targetLength =
      startingLength +
      target

    while (
      tickHistory.length <
      targetLength
    ) {
      if (
        shouldStop()
      ) {
        return
      }

      await sleep(100)
    }
  }

  /* =======================================================
  START STREAM
  ======================================================= */

  void startTickStream().catch(
    () => {
      /*
       * The error was already
       * reported by startTickStream.
       */
    },
  )

  /*
   * The generated bot can finish, but the
   * WebSocket subscriptions must not remain
   * attached forever.
   *
   * The runner should call the cleanup hook
   * below if it wants explicit cleanup.
   */
  const api: BotApi = {
    purchase,
    sellAtMarket,

    isContractOpen,
    isSellAvailable,

    getAskPrice,
    getPayout,
    getSellPrice,

    getTick,
    getTicks,
    getLastDigit,
    getLastDigitList,
    getDirection,

    getOHLC,
    getOHLCValues,
    readOHLC,
    readOHLCObject,
    isCandleBlack,
    getCurrentCandleTime,
    isNewCandle,

    getSMA,
    getSMAArray,
    getEMA,
    getEMAArray,
    getRSI,
    getRSIArray,
    getBollingerBands,
    getBollingerBandsArray,
    getMACDArray,

    getBalance,
    getLastResult,
    getDetails,

    getTotalProfit,
    getTotalRuns,

    setStake,
    getStake,

    setBarrier,
    getBarrier,

    shouldStop,

    notify,
    console:
      writeConsole,

    sleep,
    tickDelay,

    cleanup:
      async () => {
        if (disposed) {
          return
        }

        disposed =
          true

        await cleanupSubscriptions()
      },
  }

  return api
}

export default createBotApi