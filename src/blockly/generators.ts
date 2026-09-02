import * as Blockly from 'blockly'
import { javascriptGenerator } from 'blockly/javascript'



function unsupportedValue(block: Blockly.Block): string {
  return [
    '(function(){throw new Error(',
    JSON.stringify(
      'Unsupported Blockly value block: ' +
        block.type +
        '. This block is not implemented in this bot engine.'
    ),
    ')})()'
  ].join('')
}

function registerEmpty(type: string): void {
  javascriptGenerator.forBlock[type] = function (): [string, number] | string {
    return ''
  }
}

/*
 * Root / configuration blocks
 */
registerEmpty('trade_definition')
registerEmpty('trade_definition_market')
registerEmpty('trade_definition_tradetype')
registerEmpty('trade_definition_contracttype')
registerEmpty('trade_definition_candleinterval')
registerEmpty('trade_definition_restartbuysell')
registerEmpty('trade_definition_restartonerror')
registerEmpty('trade_definition_tradeoptions')

/*
 * Trade execution
 */
javascriptGenerator.forBlock['purchase'] = function (block: Blockly.Block): string {
  const contractType =
    javascriptGenerator.valueToCode(
      block,
      'PURCHASE_LIST',
      javascriptGenerator.ORDER_NONE
    ) || JSON.stringify('')

  return [
    'await Bot.purchase(',
    contractType,
    ');'
  ].join('')
}

javascriptGenerator.forBlock['sell_at_market'] = function (): string {
  return 'await Bot.sellAtMarket();'
}

javascriptGenerator.forBlock['is_contract_open'] = function (): [string, number] {
  return ['Bot.isContractOpen()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

javascriptGenerator.forBlock['is_sell_available'] = function (): [string, number] {
  return ['Bot.isSellAvailable()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

javascriptGenerator.forBlock['ask_price'] = function (): [string, number] {
  return ['Bot.getAskPrice()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

javascriptGenerator.forBlock['payout'] = function (): [string, number] {
  return ['Bot.getPayout()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

javascriptGenerator.forBlock['sell_price'] = function (): [string, number] {
  return ['Bot.getSellPrice()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

/*
 * Tick / market data
 */
javascriptGenerator.forBlock['tick'] = function (): [string, number] {
  return ['Bot.getTick()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

javascriptGenerator.forBlock['ticks'] = function (): [string, number] {
  return ['Bot.getTicks()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

javascriptGenerator.forBlock['last_digit'] = function (): [string, number] {
  return ['Bot.getLastDigit()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

javascriptGenerator.forBlock['last_digit_list'] = function (): [string, number] {
  return ['Bot.getLastDigitList()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

javascriptGenerator.forBlock['check_direction'] = function (): [string, number] {
  return ['Bot.getDirection()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

/*
 * Contract result
 */
javascriptGenerator.forBlock['check_sell'] = function (): [string, number] {
  return ['Bot.isSellAvailable()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

javascriptGenerator.forBlock['contract_check_result'] = function (
  block: Blockly.Block
): [string, number] {
  const field =
    block.getFieldValue('CHECK_RESULT') ||
    block.getFieldValue('RESULT') ||
    'win'

  return [
    'Bot.getLastResult() === ' + JSON.stringify(field),
    javascriptGenerator.ORDER_EQUALITY
  ]
}

javascriptGenerator.forBlock['read_details'] = function (
  block: Blockly.Block
): [string, number] {
  const detail =
    block.getFieldValue('DETAIL_INDEX') ||
    block.getFieldValue('DETAIL') ||
    ''

  return [
    'Bot.getDetails(' + JSON.stringify(detail) + ')',
    javascriptGenerator.ORDER_FUNCTION_CALL
  ]
}

javascriptGenerator.forBlock['trade_again'] = function (): string {
  return 'await Bot.purchase();'
}

/*
 * Statistics
 */
javascriptGenerator.forBlock['stat'] = function (
  block: Blockly.Block
): [string, number] {
  const stat =
    block.getFieldValue('STAT') ||
    block.getFieldValue('STAT_TYPE') ||
    ''

  return [
    'Bot.getDetails(' + JSON.stringify(stat) + ')',
    javascriptGenerator.ORDER_FUNCTION_CALL
  ]
}

javascriptGenerator.forBlock['total_profit'] = function (): [string, number] {
  return ['Bot.getTotalProfit()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

javascriptGenerator.forBlock['total_runs'] = function (): [string, number] {
  return ['Bot.getTotalRuns()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

/*
 * Stake
 */
javascriptGenerator.forBlock['set_stake'] = function (
  block: Blockly.Block
): string {
  const amount =
    javascriptGenerator.valueToCode(
      block,
      'STAKE',
      javascriptGenerator.ORDER_NONE
    ) ||
    javascriptGenerator.valueToCode(
      block,
      'AMOUNT',
      javascriptGenerator.ORDER_NONE
    ) ||
    '0'

  return 'Bot.setStake(Number(' + amount + '));'
}

javascriptGenerator.forBlock['get_stake'] = function (): [string, number] {
  return ['Bot.getStake()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

/*
 * Barrier
 */
javascriptGenerator.forBlock['set_barrier'] = function (
  block: Blockly.Block
): string {
  const barrier =
    javascriptGenerator.valueToCode(
      block,
      'BARRIER',
      javascriptGenerator.ORDER_NONE
    ) ||
    JSON.stringify(
      block.getFieldValue('BARRIER') ||
        block.getFieldValue('PREDICTION') ||
        ''
    )

  return 'Bot.setBarrier(' + barrier + ');'
}

javascriptGenerator.forBlock['get_barrier'] = function (): [string, number] {
  return ['Bot.getBarrier()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

/*
 * Account
 */
javascriptGenerator.forBlock['balance'] = function (): [string, number] {
  return ['Bot.getBalance()', javascriptGenerator.ORDER_FUNCTION_CALL]
}

/*
 * Notifications
 */
javascriptGenerator.forBlock['notify'] = function (
  block: Blockly.Block
): string {
  const type =
    block.getFieldValue('TYPE') ||
    block.getFieldValue('NOTIFICATION_TYPE') ||
    'info'

  const message =
    javascriptGenerator.valueToCode(
      block,
      'MESSAGE',
      javascriptGenerator.ORDER_NONE
    ) ||
    JSON.stringify(
      block.getFieldValue('MESSAGE') ||
        block.getFieldValue('TEXT') ||
        ''
    )

  return (
    'Bot.notify(' +
    JSON.stringify(type) +
    ', String(' +
    message +
    '));'
  )
}

javascriptGenerator.forBlock['console'] = function (
  block: Blockly.Block
): string {
  const type =
    block.getFieldValue('TYPE') ||
    block.getFieldValue('LEVEL') ||
    'info'

  const message =
    javascriptGenerator.valueToCode(
      block,
      'MESSAGE',
      javascriptGenerator.ORDER_NONE
    ) ||
    JSON.stringify(
      block.getFieldValue('MESSAGE') ||
        block.getFieldValue('TEXT') ||
        ''
    )

  return (
    'Bot.console(' +
    JSON.stringify(type) +
    ', ' +
    message +
    ');'
  )
}

/*
 * Timing
 */
javascriptGenerator.forBlock['sleep'] = function (
  block: Blockly.Block
): string {
  const ms =
    javascriptGenerator.valueToCode(
      block,
      'MS',
      javascriptGenerator.ORDER_NONE
    ) || '1000'

  return 'await Bot.sleep(Number(' + ms + '));'
}

javascriptGenerator.forBlock['tick_delay'] = function (
  block: Blockly.Block
): string {
  const count =
    javascriptGenerator.valueToCode(
      block,
      'TICKS',
      javascriptGenerator.ORDER_NONE
    ) ||
    javascriptGenerator.valueToCode(
      block,
      'COUNT',
      javascriptGenerator.ORDER_NONE
    ) ||
    '1'

  return 'await Bot.tickDelay(Number(' + count + '));'
}

/*
 * Time helpers
 */
javascriptGenerator.forBlock['epoch'] = function (): [string, number] {
  return [
    'Math.floor(Date.now() / 1000)',
    javascriptGenerator.ORDER_FUNCTION_CALL
  ]
}

javascriptGenerator.forBlock['timeout'] = function (
  block: Blockly.Block
): string {
  const duration =
    javascriptGenerator.valueToCode(
      block,
      'SECONDS',
      javascriptGenerator.ORDER_NONE
    ) || '1'

  return 'await Bot.sleep(Number(' + duration + ') * 1000);'
}

javascriptGenerator.forBlock['todatetime'] = function (
  block: Blockly.Block
): [string, number] {
  const value =
    javascriptGenerator.valueToCode(
      block,
      'VALUE',
      javascriptGenerator.ORDER_NONE
    ) || 'Date.now() / 1000'

  return [
    'new Date(Number(' + value + ') * 1000).toLocaleString()',
    javascriptGenerator.ORDER_FUNCTION_CALL
  ]
}

javascriptGenerator.forBlock['totimestamp'] = function (
  block: Blockly.Block
): [string, number] {
  const value =
    javascriptGenerator.valueToCode(
      block,
      'VALUE',
      javascriptGenerator.ORDER_NONE
    ) || 'Date.now()'

  return [
    'Math.floor(new Date(' + value + ').getTime() / 1000)',
    javascriptGenerator.ORDER_FUNCTION_CALL
  ]
}

/*
 * Generic text blocks
 */
javascriptGenerator.forBlock['text_join'] = function (
  block: Blockly.Block
): [string, number] {
  const count =
  Number(
    (block as unknown as { itemCount_?: number }).itemCount_ || 0
  )
  const parts: string[] = []

  for (let i = 0; i < count; i += 1) {
    parts.push(
      javascriptGenerator.valueToCode(
        block,
        'ADD' + i,
        javascriptGenerator.ORDER_NONE
      ) || JSON.stringify('')
    )
  }

  return [
    '[' + parts.join(', ') + '].join("")',
    javascriptGenerator.ORDER_FUNCTION_CALL
  ]
}

javascriptGenerator.forBlock['text_statement'] = function (
  block: Blockly.Block
): string {
  const text =
    javascriptGenerator.valueToCode(
      block,
      'TEXT',
      javascriptGenerator.ORDER_NONE
    ) ||
    JSON.stringify(
      block.getFieldValue('TEXT') || ''
    )

  return 'String(' + text + ');'
}

/*
 * Blockly control / container blocks
 */
javascriptGenerator.forBlock['block_holder'] = function (
  block: Blockly.Block
): string {
  return javascriptGenerator.statementToCode(block, 'DO')
}

javascriptGenerator.forBlock['trade_definition_market'] = function (): string {
  return ''
}

javascriptGenerator.forBlock['trade_definition_tradetype'] = function (): string {
  return ''
}

javascriptGenerator.forBlock['trade_definition_contracttype'] = function (): string {
  return ''
}

javascriptGenerator.forBlock['trade_definition_candleinterval'] = function (): string {
  return ''
}

javascriptGenerator.forBlock['trade_definition_restartbuysell'] = function (): string {
  return ''
}

javascriptGenerator.forBlock['trade_definition_restartonerror'] = function (): string {
  return ''
}

javascriptGenerator.forBlock['trade_definition_tradeoptions'] = function (): string {
  return ''
}

/*
 * Unsupported blocks
 *
 * We deliberately throw instead of returning fake values.
 * This prevents a bot from silently trading using incorrect data.
 */
const unsupportedTypes = [
  'sma',
  'ema',
  'bollinger',
  'rsi',
  'macd',
  'stochastic',
  'ichimoku',
  'awesome_oscillator',
  'wma',
  'williams_r',
  'candle',
  'candle_open',
  'candle_close',
  'candle_high',
  'candle_low',
  'candle_color',
  'ohlc',
  'indicator'
]

for (const type of unsupportedTypes) {
  javascriptGenerator.forBlock[type] = function (
    block: Blockly.Block
  ): [string, number] {
    return [
      unsupportedValue(block),
      javascriptGenerator.ORDER_FUNCTION_CALL
    ]
  }
}

/*
 * Catch blocks that exist in the workspace but do not have
 * a generator registered above.
 */
function generateStatementChain(
  first: Blockly.Block | null
): string {
  const output: string[] = []
  let current = first

  while (current) {
    const generated = javascriptGenerator.blockToCode(current)

    if (typeof generated === 'string') {
      output.push(generated)
    } else if (Array.isArray(generated)) {
      output.push(generated[0])
    }

    current = current.getNextBlock()
  }

  return output.join('\n')
}

/*
 * Main bot program generator
 */
export function generateBotCode(
  workspace: Blockly.Workspace
): string {
  const roots = workspace.getTopBlocks(true)

  const tradeDefinition =
    roots.find(
      block =>
        block.type === 'trade_definition' ||
        block.type === 'trade'
    ) || null

  const before =
    roots.find(block => block.type === 'before_purchase') || null

  const during =
    roots.find(block => block.type === 'during_purchase') || null

  const after =
    roots.find(block => block.type === 'after_purchase') || null

  const sections: string[] = []

  sections.push('async function runBot() {')
  sections.push('  Bot.notify("info", "Bot started");')

  if (tradeDefinition) {
    sections.push(
      '  // Trade definition loaded from Blockly workspace'
    )
  }

  if (before) {
    const code = generateStatementChain(before.getNextBlock())

    if (code.trim()) {
      sections.push('  // Before purchase')
      sections.push(
        code
          .split('\n')
          .map(line => '  ' + line)
          .join('\n')
      )
    }
  }

  if (during) {
    const code = generateStatementChain(during.getNextBlock())

    if (code.trim()) {
      sections.push('  // During purchase')
      sections.push(
        code
          .split('\n')
          .map(line => '  ' + line)
          .join('\n')
      )
    }
  }

  if (after) {
    const code = generateStatementChain(after.getNextBlock())

    if (code.trim()) {
      sections.push('  // After purchase')
      sections.push(
        code
          .split('\n')
          .map(line => '  ' + line)
          .join('\n')
      )
    }
  }

  sections.push('  Bot.notify("success", "Bot finished");')
  sections.push('}')
  sections.push('')
  sections.push('return runBot();')

  return sections.join('\n')
}

export default javascriptGenerator