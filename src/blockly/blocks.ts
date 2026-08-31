// Custom block definitions ported from deriv-com/bot (MIT licensed).
// Trade execution bindings (the code generators that call the Deriv API)
// are intentionally omitted for Phase 1 — blocks are visually present
// but non-functional. TODO(phase2): wire generators to our DerivWS.

import * as Blockly from 'blockly'
import { Colours, Categories } from './colours'

// ── Shared market/symbol state ───────────────────────────
// Module-level mutable state populated by setGlobalMarketOptions().
// Dropdown menu functions read from these live, so as long as the
// state is populated before a block is created from XML, saved values
// validate correctly during deserialization — no per-instance patching.

export interface RawSymbol {
  market: string
  market_display_name?: string
  submarket: string
  submarket_display_name?: string
  underlying_symbol?: string
  symbol?: string
  underlying_symbol_name?: string
  display_name?: string
  exchange_is_open: number
  pip_size?: number
  pip?: number
}

let marketOptions: [string, string][] = [['', '']]
let submarketOptionsByMarket: Record<string, [string, string][]> = {}
let symbolOptionsBySubmarket: Record<string, [string, string][]> = {}
let tradeTypeCategoryOptions: [string, string][] = [['', '']]
let tradeTypeOptionsByCategory: Record<string, [string, string][]> = {}
let contractTypeOptionsByTradeType: Record<string, [string, string][]> = {}

function marketMenuOptions(this: any): [string, string][] {
  return marketOptions
}

function submarketMenuOptions(this: any): [string, string][] {
  const block = this.getSourceBlock()
  if (!block) return [['—', '']]
  const market = block.getFieldValue('MARKET_LIST')
  return submarketOptionsByMarket[market] || [['—', '']]
}

function symbolMenuOptions(this: any): [string, string][] {
  const block = this.getSourceBlock()
  if (!block) return [['—', '']]
  const submarket = block.getFieldValue('SUBMARKET_LIST')
  return symbolOptionsBySubmarket[submarket] || [['—', '']]
}

function tradeTypeCategoryMenuOptions(this: any): [string, string][] {
  return tradeTypeCategoryOptions
}

function tradeTypeMenuOptions(this: any): [string, string][] {
  const block = this.getSourceBlock()
  if (!block) return [['—', '']]
  const category = block.getFieldValue('TRADETYPECAT_LIST')
  return tradeTypeOptionsByCategory[category] || [['—', '']]
}

// Walk backward through the statement stack to find the paired
// trade_definition_tradetype block. Exported so repairLoadedBot can reuse
// the same logic instead of duplicating the traversal.
export function findPairedTradeTypeBlock(block: Blockly.Block): Blockly.Block | null {
  let cursor: Blockly.Block | null = block
  while (cursor) {
    if (cursor.type === 'trade_definition_tradetype') return cursor
    cursor = cursor.getPreviousBlock()
  }
  return null
}

// Flatten all contract type options across every trade type. Used as a
// fallback during XML deserialization: Blockly sets a field's value before
// the block is connected to the statement stack, so getPreviousBlock()
// returns null at that point. Returning the full superset lets the saved
// value validate; the dropdown narrows to the correct subset once the
// block is connected and the options function re-runs.
function allContractTypeOptions(): [string, string][] {
  const seen = new Set<string>()
  const all: [string, string][] = []
  for (const opts of Object.values(contractTypeOptionsByTradeType)) {
    for (const [label, value] of opts) {
      if (!seen.has(value)) {
        seen.add(value)
        all.push([label, value])
      }
    }
  }
  return all
}

function contractTypeMenuOptions(this: any): [string, string][] {
  const block = this.getSourceBlock()
  if (!block) return [['—', '']]
  const paired = findPairedTradeTypeBlock(block)
  if (!paired) return allContractTypeOptions()
  const tradeType = paired.getFieldValue('TRADETYPE_LIST')
  return contractTypeOptionsByTradeType[tradeType] || [['—', '']]
}

// Walk the TRADE_OPTIONS statement stack of the workspace's trade_definition
// root block to read the current trade type and contract type, then return
// the concrete purchasable contract types. When the contract type is 'both',
// all real options for that trade type are returned; otherwise only the
// single matching option. The synthetic 'both' entry is always excluded —
// only real contract types are ever purchasable.
export function getPurchaseListOptions(workspace: Blockly.Workspace): [string, string][] {
  const topBlocks = workspace.getTopBlocks(false)
  const root = topBlocks.find((b) => b.type === 'trade_definition')
  if (!root) return [['—', '']]
  let block: Blockly.Block | null = root.getInputTargetBlock('TRADE_OPTIONS')
  let tradeType = ''
  let contractType = ''
  while (block) {
    if (block.type === 'trade_definition_tradetype') {
      tradeType = String(block.getFieldValue('TRADETYPE_LIST') || '')
    } else if (block.type === 'trade_definition_contracttype') {
      contractType = String(block.getFieldValue('TYPE_LIST') || '')
    }
    block = block.getNextBlock()
  }
  const allOptionsForTradeType = contractTypeOptionsByTradeType[tradeType] || []
  const realOptions = allOptionsForTradeType.filter(([, value]) => value !== 'both')
  if (contractType && contractType !== 'both') {
    return realOptions.filter(([, value]) => value === contractType)
  }
  return realOptions.length ? realOptions : [['—', '']]
}

function purchaseListOptions(this: any): [string, string][] {
  const block = this.getSourceBlock()
  if (!block) return [['—', '']]
  return getPurchaseListOptions(block.workspace)
}

// Accessors for the self-healing pass in loadBotXmlSafely — let it pick
// the first valid option for a field whose saved value no longer exists.
export function getFirstMarketValue(): string {
  return marketOptions[0]?.[1] ?? ''
}
export function getFirstSubmarketValue(market: string): string {
  return submarketOptionsByMarket[market]?.[0]?.[1] ?? ''
}
export function getFirstSymbolValue(submarket: string): string {
  return symbolOptionsBySubmarket[submarket]?.[0]?.[1] ?? ''
}
export function getFirstTradeTypeCategoryValue(): string {
  return tradeTypeCategoryOptions[0]?.[1] ?? ''
}
export function getFirstTradeTypeValue(category: string): string {
  return tradeTypeOptionsByCategory[category]?.[0]?.[1] ?? ''
}
export function getFirstContractTypeValue(tradeType: string): string {
  return contractTypeOptionsByTradeType[tradeType]?.[0]?.[1] ?? ''
}

// Validators for the self-healing pass — check whether a saved field value
// still exists in the current market data (a stale value poisons the cascade).
export function isValidMarketValue(v: string): boolean {
  return marketOptions.some((opt) => opt[1] === v)
}
export function isValidSubmarketValue(market: string, v: string): boolean {
  return (submarketOptionsByMarket[market] || []).some((opt) => opt[1] === v)
}
export function isValidSymbolValue(submarket: string, v: string): boolean {
  return (symbolOptionsBySubmarket[submarket] || []).some((opt) => opt[1] === v)
}
export function isValidTradeTypeCategoryValue(v: string): boolean {
  return tradeTypeCategoryOptions.some((opt) => opt[1] === v)
}
export function isValidTradeTypeValue(category: string, v: string): boolean {
  return (tradeTypeOptionsByCategory[category] || []).some((opt) => opt[1] === v)
}
export function isValidContractTypeValue(tradeType: string, v: string): boolean {
  return (contractTypeOptionsByTradeType[tradeType] || []).some((opt) => opt[1] === v)
}

function prettifyKey(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

export function setGlobalMarketOptions(rawSymbols: RawSymbol[]): boolean {
  const markets: [string, string][] = []
  const submarketsByMarket: Record<string, [string, string][]> = {}
  const symbolsBySubmarket: Record<string, [string, string][]> = {}

  for (const s of rawSymbols) {
    const market = s.market
    const marketDisplay = s.market_display_name ?? prettifyKey(market)
    const submarket = s.submarket
    const submarketDisplay = s.submarket_display_name ?? prettifyKey(submarket)
    const symbol = s.underlying_symbol ?? s.symbol ?? ''
    const symbolDisplay = s.underlying_symbol_name ?? s.display_name ?? symbol

    if (!submarketsByMarket[market]) {
      submarketsByMarket[market] = []
      markets.push([marketDisplay, market])
    }
    if (!submarketsByMarket[market].find((sm) => sm[1] === submarket)) {
      submarketsByMarket[market].push([submarketDisplay, submarket])
    }
    if (!symbolsBySubmarket[submarket]) {
      symbolsBySubmarket[submarket] = []
    }
    symbolsBySubmarket[submarket].push([symbolDisplay, symbol])
  }

  if (markets.length === 0) return false

  marketOptions = markets
  submarketOptionsByMarket = submarketsByMarket
  symbolOptionsBySubmarket = symbolsBySubmarket

  tradeTypeCategoryOptions = [
    ['Up/Down', 'updown'],
    ['Touch/No Touch', 'touchnotouch'],
    ['In/Out', 'inout'],
    ['Digits', 'digits'],
  ]
  tradeTypeOptionsByCategory = {
    updown: [['Rise/Fall', 'risefall'], ['Higher/Lower', 'higherlower']],
    touchnotouch: [['Touch/No Touch', 'touchnotouch']],
    inout: [['Ends In/Out', 'endsinout'], ['Stays In/Goes Out', 'staysinout']],
    digits: [
      ['Matches/Differs', 'matchesdiffers'],
      ['Even/Odd', 'evenodd'],
      ['Over/Under', 'overunder'],
    ],
  }
  contractTypeOptionsByTradeType = {
    risefall: [['Rise/Fall (both)', 'both'], ['Rise', 'CALL'], ['Fall', 'PUT']],
    higherlower: [['Higher/Lower (both)', 'both'], ['Higher', 'CALL'], ['Lower', 'PUT']],
    touchnotouch: [['Touch/No Touch (both)', 'both'], ['Touch', 'ONETOUCH'], ['No Touch', 'NOTOUCH']],
    endsinout: [['Ends Between/Outside (both)', 'both'], ['Ends Between', 'EXPIRYRANGE'], ['Ends Outside', 'EXPIRYMISS']],
    staysinout: [['Stays Between/Goes Outside (both)', 'both'], ['Stays Between', 'RANGE'], ['Goes Outside', 'UPORDOWN']],
    matchesdiffers: [['Matches/Differs (both)', 'both'], ['Matches', 'DIGITMATCH'], ['Differs', 'DIGITDIFF']],
    evenodd: [['Even/Odd (both)', 'both'], ['Even', 'DIGITEVEN'], ['Odd', 'DIGITODD']],
    overunder: [['Over/Under (both)', 'both'], ['Over', 'DIGITOVER'], ['Under', 'DIGITUNDER']],
  }

  return true
}

// ── Helpers ──────────────────────────────────────────────
function defineBlock(
  name: string,
  def: { definition: () => Record<string, unknown>; initExtra?: (this: Blockly.Block) => void },
) {
  Blockly.Blocks[name] = {
    init(this: Blockly.Block) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this as any).jsonInit(def.definition())
      def.initExtra?.call(this)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

// ── 1. Trade parameters (root block) ─────────────────────
defineBlock('trade_definition', {
  definition: () => ({
    message0: '%1 %2',
    message1: '%1',
    message2: '%1 %2',
    message3: '%1',
    message4: '%1 %2',
    message5: '%1',
    message6: '%1',
    args0: [
      { type: 'field_label', text: '1. Trade parameters' },
      { type: 'input_dummy' },
    ],
    args1: [{ type: 'input_statement', name: 'TRADE_OPTIONS' }],
    args2: [
      { type: 'field_label', text: 'Run once at start:' },
      { type: 'input_dummy' },
    ],
    args3: [{ type: 'input_statement', name: 'INITIALIZATION', check: null }],
    args4: [
      { type: 'field_label', text: 'Trade options:' },
      { type: 'input_dummy' },
    ],
    args5: [{ type: 'input_statement', name: 'SUBMARKET' }],
    args6: [{ type: 'input_dummy' }],
    colour: Colours.RootBlock.colour,
    colourSecondary: Colours.RootBlock.colourSecondary,
    colourTertiary: Colours.RootBlock.colourTertiary,
    tooltip: 'Define your trade parameters here.',
    category: Categories.Trade_Definition,
  }),
  initExtra() {
    this.setDeletable(false)
  },
})

defineBlock('trade_definition_market', {
  definition: () => ({
    message0: 'Market: %1 > %2 > %3',
    args0: [
      { type: 'field_dropdown', name: 'MARKET_LIST', options: marketMenuOptions },
      { type: 'field_dropdown', name: 'SUBMARKET_LIST', options: submarketMenuOptions },
      { type: 'field_dropdown', name: 'SYMBOL_LIST', options: symbolMenuOptions },
    ],
    colour: Colours.Special1.colour,
    colourSecondary: Colours.Special1.colourSecondary,
    colourTertiary: Colours.Special1.colourTertiary,
    previousStatement: null,
    nextStatement: null,
    category: Categories.Trade_Definition,
  }),
  initExtra() {
    this.setMovable(false)
    this.setDeletable(false)
  },
})

defineBlock('trade_definition_tradetype', {
  definition: () => ({
    message0: 'Trade type: %1 > %2',
    args0: [
      { type: 'field_dropdown', name: 'TRADETYPECAT_LIST', options: tradeTypeCategoryMenuOptions },
      { type: 'field_dropdown', name: 'TRADETYPE_LIST', options: tradeTypeMenuOptions },
    ],
    colour: Colours.Special1.colour,
    colourSecondary: Colours.Special1.colourSecondary,
    colourTertiary: Colours.Special1.colourTertiary,
    previousStatement: null,
    nextStatement: null,
    category: Categories.Trade_Definition,
  }),
  initExtra() {
    this.setMovable(false)
    this.setDeletable(false)
  },
})

defineBlock('trade_definition_contracttype', {
  definition: () => ({
    message0: 'Contract type: %1',
    args0: [{ type: 'field_dropdown', name: 'TYPE_LIST', options: contractTypeMenuOptions }],
    colour: Colours.Special1.colour,
    colourSecondary: Colours.Special1.colourSecondary,
    colourTertiary: Colours.Special1.colourTertiary,
    previousStatement: null,
    nextStatement: null,
    category: Categories.Trade_Definition,
  }),
  initExtra() {
    this.setMovable(false)
    this.setDeletable(false)
  },
})

defineBlock('trade_definition_candleinterval', {
  definition: () => ({
    message0: 'Candle interval: %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'CANDLEINTERVAL_LIST',
        options: [
          ['1 minute', '60'],
          ['2 minutes', '120'],
          ['3 minutes', '180'],
          ['5 minutes', '300'],
          ['10 minutes', '600'],
          ['15 minutes', '900'],
          ['30 minutes', '1800'],
          ['1 hour', '3600'],
          ['2 hours', '7200'],
          ['4 hours', '14400'],
          ['8 hours', '28800'],
          ['1 day', '86400'],
        ],
      },
    ],
    colour: Colours.Special1.colour,
    colourSecondary: Colours.Special1.colourSecondary,
    colourTertiary: Colours.Special1.colourTertiary,
    previousStatement: null,
    nextStatement: null,
    category: Categories.Trade_Definition,
  }),
  initExtra() {
    this.setMovable(false)
    this.setDeletable(false)
  },
})

defineBlock('trade_definition_restartbuysell', {
  definition: () => ({
    message0: 'Restart buy/sell on error: %1',
    args0: [
      { type: 'field_checkbox', name: 'TIME_MACHINE_ENABLED', checked: false },
    ],
    colour: Colours.Special1.colour,
    colourSecondary: Colours.Special1.colourSecondary,
    colourTertiary: Colours.Special1.colourTertiary,
    previousStatement: null,
    nextStatement: null,
    category: Categories.Trade_Definition,
  }),
  initExtra() {
    this.setMovable(false)
    this.setDeletable(false)
  },
})

defineBlock('trade_definition_restartonerror', {
  definition: () => ({
    message0: 'Restart on error: %1',
    args0: [
      { type: 'field_checkbox', name: 'RESTARTONERROR', checked: true }
    ],
    colour: Colours.Special1.colour,
    colourSecondary: Colours.Special1.colourSecondary,
    colourTertiary: Colours.Special1.colourTertiary,
    previousStatement: null,
    nextStatement: null,
    category: Categories.Trade_Definition,
  }),
  initExtra() {
    this.setMovable(false)
    this.setDeletable(false)
  },
})

defineBlock('trade_definition_tradeoptions', {
  definition: () => ({
    message0: 'Duration: %1 %2  Amount: %3 %4  Prediction: %5',
    args0: [
      { type: 'input_value', name: 'DURATION', check: 'Number' },
      {
        type: 'field_dropdown',
        name: 'DURATIONTYPE_LIST',
        options: [
          ['ticks', 't'],
          ['seconds', 's'],
          ['minutes', 'm'],
          ['hours', 'h'],
        ],
      },
      { type: 'input_value', name: 'AMOUNT', check: 'Number' },
      {
        type: 'field_dropdown',
        name: 'CURRENCY_LIST',
        options: [
          ['USD', 'USD'],
          ['EUR', 'EUR'],
          ['GBP', 'GBP'],
          ['AUD', 'AUD'],
        ],
      },
      { type: 'input_value', name: 'PREDICTION', check: 'Number' },
    ],
    colour: Colours.Special1.colour,
    colourSecondary: Colours.Special1.colourSecondary,
    colourTertiary: Colours.Special1.colourTertiary,
    previousStatement: null,
    nextStatement: null,
    category: Categories.Trade_Definition,
  }),
})

// ── 2. Purchase conditions (Before Purchase) ─────────────
defineBlock('before_purchase', {
  definition: () => ({
    message0: '%1 %2',
    message1: '%1',
    message2: '%1',
    args0: [
      { type: 'field_label', text: '2. Purchase conditions' },
      { type: 'input_dummy' },
    ],
    args1: [{ type: 'input_statement', name: 'BEFOREPURCHASE_STACK', check: 'Purchase' }],
    args2: [{ type: 'input_dummy' }],
    colour: Colours.RootBlock.colour,
    colourSecondary: Colours.RootBlock.colourSecondary,
    colourTertiary: Colours.RootBlock.colourTertiary,
    tooltip: 'Specify contract type and purchase conditions.',
    category: Categories.Before_Purchase,
  }),
  initExtra() {
    this.setDeletable(false)
  },
})

defineBlock('purchase', {
  definition: () => ({
    message0: 'Purchase %1',
    args0: [{ type: 'field_dropdown', name: 'PURCHASE_LIST', options: purchaseListOptions }],
    previousStatement: null,
    colour: Colours.Special1.colour,
    colourSecondary: Colours.Special1.colourSecondary,
    colourTertiary: Colours.Special1.colourTertiary,
    tooltip: 'This block purchases contract of a specified type.',
    category: Categories.Before_Purchase,
  }),
  initExtra() {
    this.setNextStatement(false)
  },
})

defineBlock('ask_price', {
  definition: () => ({
    message0: 'Ask price',
    output: 'Number',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the ask price of the current proposal.',
    category: Categories.Before_Purchase,
  }),
})

defineBlock('payout', {
  definition: () => ({
    message0: 'Payout',
    output: 'Number',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the payout of the current proposal.',
    category: Categories.Before_Purchase,
  }),
})

// ── 3. Sell conditions (During Purchase) ──────────────────
defineBlock('during_purchase', {
  definition: () => ({
    message0: '%1 %2',
    message1: '%1',
    message2: '%1',
    args0: [
      { type: 'field_label', text: '3. Sell conditions' },
      { type: 'input_dummy' },
    ],
    args1: [{ type: 'input_statement', name: 'DURING_PURCHASE_STACK', check: 'SellAtMarket' }],
    args2: [{ type: 'input_dummy' }],
    colour: Colours.RootBlock.colour,
    colourSecondary: Colours.RootBlock.colourSecondary,
    colourTertiary: Colours.RootBlock.colourTertiary,
    tooltip: 'Sell your active contract if needed (optional).',
    category: Categories.During_Purchase,
  }),
  initExtra() {
    this.setDeletable(false)
  },
})

defineBlock('check_sell', {
  definition: () => ({
    message0: 'Sell is available',
    output: 'Boolean',
    outputShape: 1,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns true if the contract can be sold.',
    category: Categories.During_Purchase,
  }),
})

defineBlock('sell_at_market', {
  definition: () => ({
    message0: 'Sell at market',
    previousStatement: 'SellAtMarket',
    nextStatement: 'SellAtMarket',
    colour: Colours.Special1.colour,
    colourSecondary: Colours.Special1.colourSecondary,
    colourTertiary: Colours.Special1.colourTertiary,
    tooltip: 'Sell the active contract at market price.',
    category: Categories.During_Purchase,
  }),
})

defineBlock('sell_price', {
  definition: () => ({
    message0: 'Sell price',
    output: 'Number',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the current sell price of the active contract.',
    category: Categories.During_Purchase,
  }),
})

// ── 4. Trade results (After Purchase) ────────────────────
defineBlock('after_purchase', {
  definition: () => ({
    message0: '%1 %2',
    message1: '%1',
    message2: '%1',
    args0: [
      { type: 'field_label', text: '4. Trade results' },
      { type: 'input_dummy' },
    ],
    args1: [{ type: 'input_statement', name: 'AFTERPURCHASE_STACK' }],
    args2: [{ type: 'input_dummy' }],
    colour: Colours.RootBlock.colour,
    colourSecondary: Colours.RootBlock.colourSecondary,
    colourTertiary: Colours.RootBlock.colourTertiary,
    tooltip: 'Decide what to do after the trade ends.',
    category: Categories.After_Purchase,
  }),
  initExtra() {
    this.setDeletable(false)
  },
})

defineBlock('contract_check_result', {
  definition: () => ({
    message0: 'Result is %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'CHECK_RESULT',
        options: [
          ['Win', 'win'],
          ['Loss', 'loss'],
        ],
      },
    ],
    output: 'Boolean',
    outputShape: 1,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Check whether the result is a win or a loss.',
    category: Categories.After_Purchase,
  }),
})

defineBlock('read_details', {
  definition: () => ({
    message0: 'Details: %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'DETAIL_INDEX',
        options: [
          ['deal reference id', '1'],
          ['purchase price', '2'],
          ['payout', '3'],
          ['profit', '4'],
          ['contract type', '5'],
          ['entry spot time', '6'],
          ['entry spot price', '7'],
          ['exit spot time', '8'],
          ['exit spot price', '9'],
          ['barrier', '10'],
          ['result', '11'],
        ],
      },
    ],
    output: null,
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Read details of the last finished contract.',
    category: Categories.After_Purchase,
  }),
})

defineBlock('trade_again', {
  definition: () => ({
    message0: 'Trade again',
    previousStatement: null,
    nextStatement: null,
    colour: Colours.Special1.colour,
    colourSecondary: Colours.Special1.colourSecondary,
    colourTertiary: Colours.Special1.colourTertiary,
    tooltip: 'Loop back to the purchase step.',
    category: Categories.After_Purchase,
  }),
})

// ── 5. Tick Analysis ────────────────────────────────────
defineBlock('tick', {
  definition: () => ({
    message0: 'Last Tick',
    output: 'Number',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the value of the last tick.',
    category: Categories.Tick_Analysis,
  }),
})

defineBlock('ticks', {
  definition: () => ({
    message0: 'Ticks',
    output: 'Array',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the list of received ticks.',
    category: Categories.Tick_Analysis,
  }),
})

defineBlock('last_digit', {
  definition: () => ({
    message0: 'Last Digit',
    output: 'Number',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the last digit of the latest tick.',
    category: Categories.Tick_Analysis,
  }),
})

defineBlock('check_direction', {
  definition: () => ({
    message0: 'Direction is %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'CHECK_DIRECTION',
        options: [
          ['Rise', 'rise'],
          ['Fall', 'fall'],
          ['No Change', ''],
        ],
      },
    ],
    output: 'Boolean',
    outputShape: 1,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Check if the latest tick rose or fell.',
    category: Categories.Tick_Analysis,
  }),
})

defineBlock('stat', {
  definition: () => ({
    message0: 'Last digit list',
    output: 'Array',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the list of last digits from received ticks.',
    category: Categories.Tick_Analysis,
  }),
})

// ── 6. Indicators ────────────────────────────────────────
function indicatorStatement(name: string, label: string, tooltip: string) {
  defineBlock(name, {
    definition: () => ({
      message0: `set %1 to ${label} %2`,
      message1: '%1',
      args0: [
        { type: 'field_variable', name: 'VARIABLE', variable: label.toLowerCase().split(' ')[0] },
        { type: 'input_dummy' },
      ],
      args1: [{ type: 'input_statement', name: 'STATEMENT', check: null }],
      colour: Colours.Base.colour,
      colourSecondary: Colours.Base.colourSecondary,
      colourTertiary: Colours.Base.colourTertiary,
      tooltip,
      previousStatement: null,
      nextStatement: null,
      category: Categories.Indicators,
    }),
  })
}

indicatorStatement('sma_statement', 'Simple Moving Average', 'Calculates SMA from a list with a period')
indicatorStatement('ema_statement', 'Exponential Moving Average', 'Calculates EMA from a list with a period')
indicatorStatement('rsi_statement', 'Relative Strength Index', 'Calculates RSI from a list with a period')
indicatorStatement('bb_statement', 'Bollinger Bands', 'Calculates Bollinger Bands from a list')

function indicatorAccessor(name: string, label: string, tooltip: string) {
  defineBlock(name, {
    definition: () => ({
      message0: `${label}`,
      output: 'Number',
      outputShape: 2,
      colour: Colours.Base.colour,
      colourSecondary: Colours.Base.colourSecondary,
      colourTertiary: Colours.Base.colourTertiary,
      tooltip,
      category: Categories.Indicators,
    }),
  })
}

indicatorAccessor('smaa_statement', 'SMA Array', 'Returns the SMA array')
indicatorAccessor('emaa_statement', 'EMA Array', 'Returns the EMA array')
indicatorAccessor('rsia_statement', 'RSI Array', 'Returns the RSI array')
indicatorAccessor('bba_statement', 'Bollinger Bands Array', 'Returns the Bollinger Bands array')
indicatorAccessor('macda_statement', 'MACD Array', 'Returns the MACD array')

// ── 7. Tools / Miscellaneous ─────────────────────────────
defineBlock('balance', {
  definition: () => ({
    message0: 'Balance: %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'BALANCE_TYPE',
        options: [
          ['string', 'STR'],
          ['number', 'NUM'],
        ],
      },
    ],
    output: null,
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'This block returns account balance.',
    category: Categories.Miscellaneous,
  }),
})

defineBlock('notify', {
  definition: () => ({
    message0: 'Notify: %1 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'NOTIFICATION_TYPE',
        options: [
          ['green', 'success'],
          ['blue', 'info'],
          ['yellow', 'warn'],
          ['red', 'error'],
        ],
      },
      { type: 'input_value', name: 'MESSAGE', check: 'String' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Display a notification message.',
    category: Categories.Miscellaneous,
  }),
})

defineBlock('console', {
  definition: () => ({
    message0: 'Print to console: %1 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'CONSOLE_TYPE',
        options: [
          ['Log', 'log'],
          ['Warn', 'warn'],
          ['Error', 'error'],
          ['Table', 'table'],
        ],
      },
      { type: 'input_value', name: 'MESSAGE' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Print a message to the console.',
    category: Categories.Miscellaneous,
  }),
})

defineBlock('total_profit', {
  definition: () => ({
    message0: 'Total Profit',
    output: 'Number',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the total profit so far.',
    category: Categories.Miscellaneous,
  }),
})

defineBlock('total_runs', {
  definition: () => ({
    message0: 'Total Runs',
    output: 'Number',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the total number of runs.',
    category: Categories.Miscellaneous,
  }),
})

defineBlock('block_holder', {
  definition: () => ({
    message0: '',
    previousStatement: null,
    nextStatement: null,
    colour: Colours.Special4.colour,
    colourSecondary: Colours.Special4.colourSecondary,
    colourTertiary: Colours.Special4.colourTertiary,
    tooltip: 'Placeholder block holder.',
    category: Categories.Miscellaneous,
  }),
})

defineBlock('set_stake', {
  definition: () => ({
    message0: 'Set stake to %1',
    args0: [{ type: 'input_value', name: 'STAKE', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Set the stake amount for the next trade.',
    category: Categories.Miscellaneous,
  }),
})

defineBlock('get_stake', {
  definition: () => ({
    message0: 'Current stake',
    output: 'Number',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the current stake amount.',
    category: Categories.Miscellaneous,
  }),
})

// ── 8. Tools / Time ──────────────────────────────────────
defineBlock('epoch', {
  definition: () => ({
    message0: 'Seconds Since Epoch',
    output: 'Number',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns the number of seconds since January 1st, 1970.',
    category: Categories.Time,
  }),
})

defineBlock('timeout', {
  definition: () => ({
    message0: '%1 %2 Run after %3 second(s)',
    args0: [
      { type: 'input_dummy' },
      { type: 'input_statement', name: 'TIMEOUTSTACK' },
      { type: 'input_value', name: 'SECONDS' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Run the contained blocks after a delay.',
    category: Categories.Time,
  }),
})

defineBlock('tick_delay', {
  definition: () => ({
    message0: '%1 %2 Run after %3 tick(s)',
    args0: [
      { type: 'input_dummy' },
      { type: 'input_statement', name: 'TICKDELAYSTACK' },
      { type: 'input_value', name: 'TICKDELAYVALUE' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Run the contained blocks after a number of ticks.',
    category: Categories.Time,
  }),
})

defineBlock('todatetime', {
  definition: () => ({
    message0: 'Convert to date: %1',
    args0: [{ type: 'input_value', name: 'TIMESTAMP', check: 'Number' }],
    output: 'String',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Convert a timestamp to a human-readable date.',
    category: Categories.Time,
  }),
})

defineBlock('totimestamp', {
  definition: () => ({
    message0: 'Convert to timestamp: %1',
    args0: [{ type: 'input_value', name: 'DATETIME', check: 'String' }],
    output: 'Number',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Convert a date string to a timestamp.',
    category: Categories.Time,
  }),
})

// ── 9. Candle tools ──────────────────────────────────────
defineBlock('is_candle_black', {
  definition: () => ({
    message0: 'Candle is black',
    output: 'Boolean',
    outputShape: 1,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns true if the candle is black (bearish).',
    category: Categories.Candle,
  }),
})

defineBlock('ohlc_values_in_list', {
  definition: () => ({
    message0: 'OHLC values in list',
    output: 'Array',
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Returns OHLC values as a list.',
    category: Categories.Candle,
  }),
})

defineBlock('read_ohlc_obj', {
  definition: () => ({
    message0: 'Read OHLC object',
    output: null,
    outputShape: 2,
    colour: Colours.Base.colour,
    colourSecondary: Colours.Base.colourSecondary,
    colourTertiary: Colours.Base.colourTertiary,
    tooltip: 'Read the OHLC object.',
    category: Categories.Candle,
  }),
})


