// Custom block definitions ported from deriv-com/bot (MIT licensed).
// Trade execution bindings (the code generators that call the Deriv API)
// are intentionally omitted for Phase 1 — blocks are visually present
// but non-functional. TODO(phase2): wire generators to our DerivWS.

import * as Blockly from 'blockly'
import { Colours, Categories } from './colours'

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
      { type: 'field_dropdown', name: 'MARKET_LIST', options: [['', '']] },
      { type: 'field_dropdown', name: 'SUBMARKET_LIST', options: [['', '']] },
      { type: 'field_dropdown', name: 'SYMBOL_LIST', options: [['', '']] },
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
      { type: 'field_dropdown', name: 'TRADETYPECAT_LIST', options: [['', '']] },
      { type: 'field_dropdown', name: 'TRADETYPE_LIST', options: [['', '']] },
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
    args0: [{ type: 'field_dropdown', name: 'TYPE_LIST', options: [['', '']] }],
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
          ['5 minutes', '300'],
          ['15 minutes', '900'],
          ['1 hour', '3600'],
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
      {
        type: 'field_dropdown',
        name: 'TIME_MACHINE_ENABLED',
        options: [
          ['False', 'FALSE'],
          ['True', 'TRUE'],
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

defineBlock('trade_definition_restartonerror', {
  definition: () => ({
    message0: 'Restart on error: %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'RESTARTONERROR',
        options: [
          ['True', 'TRUE'],
          ['False', 'FALSE'],
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

defineBlock('trade_definition_tradeoptions', {
  definition: () => ({
    message0: 'Duration: %1 %2  Amount: %3 %4',
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
    args0: [{ type: 'field_dropdown', name: 'PURCHASE_LIST', options: [['', '']] }],
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

defineBlock('check_result', {
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
        name: 'DETAILS',
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
    message0: 'Print to console: %1',
    args0: [{ type: 'input_value', name: 'VALUE' }],
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

defineBlock('tickdelay', {
  definition: () => ({
    message0: '%1 %2 Run after %3 tick(s)',
    args0: [
      { type: 'input_dummy' },
      { type: 'input_statement', name: 'TIMEOUTSTACK' },
      { type: 'input_value', name: 'TICKS' },
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
