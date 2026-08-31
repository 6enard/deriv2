import * as Blockly from 'blockly'
import { javascriptGenerator } from 'blockly/javascript'

let generatorsRegistered = false

export function registerGenerators(): void {
  if (generatorsRegistered) return
  generatorsRegistered = true

  // ── Root blocks: emit nothing (handled by generateBotCode) ──
  javascriptGenerator.forBlock['trade_definition'] = () => ''
  javascriptGenerator.forBlock['before_purchase'] = () => ''
  javascriptGenerator.forBlock['during_purchase'] = () => ''
  javascriptGenerator.forBlock['after_purchase'] = () => ''

  // ── Trade definition sub-blocks: emit nothing (params extracted separately) ──
  javascriptGenerator.forBlock['trade_definition_market'] = () => ''
  javascriptGenerator.forBlock['trade_definition_tradetype'] = () => ''
  javascriptGenerator.forBlock['trade_definition_contracttype'] = () => ''
  javascriptGenerator.forBlock['trade_definition_candleinterval'] = () => ''
  javascriptGenerator.forBlock['trade_definition_restartbuysell'] = () => ''
  javascriptGenerator.forBlock['trade_definition_restartonerror'] = () => ''
  javascriptGenerator.forBlock['trade_definition_tradeoptions'] = () => ''

  // ── Purchase conditions ──
  javascriptGenerator.forBlock['purchase'] = function (block: Blockly.Block): string {
    const purchaseList = block.getFieldValue('PURCHASE_LIST') || ''
    return `await Bot.purchase(${JSON.stringify(purchaseList)});\n`
  }

  javascriptGenerator.forBlock['ask_price'] = function (): [string, number] {
    return [`Bot.getAskPrice()`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['payout'] = function (): [string, number] {
    return [`Bot.getPayout()`, javascriptGenerator.ORDER_ATOMIC]
  }

  // ── Sell conditions ──
  javascriptGenerator.forBlock['check_sell'] = function (): [string, number] {
    return [`Bot.isSellAvailable()`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['sell_at_market'] = function (): string {
    return `await Bot.sellAtMarket();\n`
  }

  javascriptGenerator.forBlock['sell_price'] = function (): [string, number] {
    return [`Bot.getSellPrice()`, javascriptGenerator.ORDER_ATOMIC]
  }

  // ── Trade results ──
  javascriptGenerator.forBlock['contract_check_result'] = function (block: Blockly.Block): [string, number] {
    const result = block.getFieldValue('CHECK_RESULT')
    return [`Bot.getLastResult() === ${JSON.stringify(result)}`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['read_details'] = function (block: Blockly.Block): [string, number] {
    const detail = block.getFieldValue('DETAIL_INDEX')
    return [`Bot.getDetails(${JSON.stringify(detail)})`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['trade_again'] = function (): string {
    return `return 'restart';\n`
  }

  // ── Tick analysis ──
  javascriptGenerator.forBlock['tick'] = function (): [string, number] {
    return [`Bot.getTick()`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['ticks'] = function (): [string, number] {
    return [`Bot.getTicks()`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['last_digit'] = function (): [string, number] {
    return [`Bot.getLastDigit()`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['check_direction'] = function (block: Blockly.Block): [string, number] {
    const direction = block.getFieldValue('CHECK_DIRECTION')
    return [`Bot.getDirection() === ${JSON.stringify(direction)}`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['stat'] = function (): [string, number] {
    return [`Bot.getLastDigitList()`, javascriptGenerator.ORDER_ATOMIC]
  }

  // ── Indicators (stubs) ──
  const indicatorStmtStub = function (block: Blockly.Block): string {
    return `/* indicator ${block.type} not yet implemented */\n`
  }
  javascriptGenerator.forBlock['sma_statement'] = indicatorStmtStub
  javascriptGenerator.forBlock['ema_statement'] = indicatorStmtStub
  javascriptGenerator.forBlock['rsi_statement'] = indicatorStmtStub
  javascriptGenerator.forBlock['bb_statement'] = indicatorStmtStub

  const indicatorOutStub = function (): [string, number] {
    return [`0`, javascriptGenerator.ORDER_ATOMIC]
  }
  javascriptGenerator.forBlock['smaa_statement'] = indicatorOutStub
  javascriptGenerator.forBlock['emaa_statement'] = indicatorOutStub
  javascriptGenerator.forBlock['rsia_statement'] = indicatorOutStub
  javascriptGenerator.forBlock['bba_statement'] = indicatorOutStub
  javascriptGenerator.forBlock['macda_statement'] = indicatorOutStub

  // ── Miscellaneous ──
  javascriptGenerator.forBlock['balance'] = function (block: Blockly.Block): [string, number] {
    const balanceType = block.getFieldValue('BALANCE_TYPE')
    if (balanceType === 'STR') {
      return [`String(Bot.getBalance())`, javascriptGenerator.ORDER_ATOMIC]
    }
    return [`Bot.getBalance()`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['notify'] = function (block: Blockly.Block): string {
    const type = block.getFieldValue('NOTIFICATION_TYPE')
    const message = javascriptGenerator.valueToCode(block, 'MESSAGE', javascriptGenerator.ORDER_NONE) || '""'
    return `Bot.notify(${JSON.stringify(type)}, ${message});\n`
  }

  javascriptGenerator.forBlock['console'] = function (block: Blockly.Block): string {
    const type = block.getFieldValue('CONSOLE_TYPE') || 'log'
    const message = javascriptGenerator.valueToCode(block, 'MESSAGE', javascriptGenerator.ORDER_NONE) || '""'
    return `Bot.console(${JSON.stringify(type)}, ${message});\n`
  }

  javascriptGenerator.forBlock['total_profit'] = function (): [string, number] {
    return [`Bot.getTotalProfit()`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['total_runs'] = function (): [string, number] {
    return [`Bot.getTotalRuns()`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['block_holder'] = function (): string {
    return ''
  }

  // ── Stake management ──
  javascriptGenerator.forBlock['set_stake'] = function (block: Blockly.Block): string {
    const value = javascriptGenerator.valueToCode(block, 'STAKE', javascriptGenerator.ORDER_NONE) || '0'
    return `Bot.setStake(${value});\n`
  }

  javascriptGenerator.forBlock['get_stake'] = function (): [string, number] {
    return [`Bot.getStake()`, javascriptGenerator.ORDER_ATOMIC]
  }

  // ── Time ──
  javascriptGenerator.forBlock['epoch'] = function (): [string, number] {
    return [`Math.floor(Date.now() / 1000)`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['timeout'] = function (block: Blockly.Block): string {
    const seconds = javascriptGenerator.valueToCode(block, 'SECONDS', javascriptGenerator.ORDER_NONE) || '0'
    const stack = javascriptGenerator.statementToCode(block, 'TIMEOUTSTACK')
    return `await (async () => { await Bot.sleep((${seconds}) * 1000); ${stack} })();\n`
  }

  javascriptGenerator.forBlock['tick_delay'] = function (block: Blockly.Block): string {
    const ticks = javascriptGenerator.valueToCode(block, 'TICKDELAYVALUE', javascriptGenerator.ORDER_NONE) || '0'
    const stack = javascriptGenerator.statementToCode(block, 'TICKDELAYSTACK')
    return `await (async () => { await Bot.tickDelay((${ticks})); ${stack} })();\n`
  }

  javascriptGenerator.forBlock['todatetime'] = function (block: Blockly.Block): [string, number] {
    const ts = javascriptGenerator.valueToCode(block, 'TIMESTAMP', javascriptGenerator.ORDER_NONE) || '0'
    return [`new Date((${ts}) * 1000).toISOString()`, javascriptGenerator.ORDER_ATOMIC]
  }

  javascriptGenerator.forBlock['totimestamp'] = function (block: Blockly.Block): [string, number] {
    const dt = javascriptGenerator.valueToCode(block, 'DATETIME', javascriptGenerator.ORDER_NONE) || '""'
    return [`Math.floor(new Date(${dt}).getTime() / 1000)`, javascriptGenerator.ORDER_ATOMIC]
  }

  // ── Candle tools (stubs) ──
  javascriptGenerator.forBlock['is_candle_black'] = function (): [string, number] {
    return [`false`, javascriptGenerator.ORDER_ATOMIC]
  }
  javascriptGenerator.forBlock['ohlc_values_in_list'] = function (): [string, number] {
    return [`[]`, javascriptGenerator.ORDER_ATOMIC]
  }
  javascriptGenerator.forBlock['read_ohlc_obj'] = function (): [string, number] {
    return [`null`, javascriptGenerator.ORDER_ATOMIC]
  }
}

export function generateBotCode(workspace: Blockly.WorkspaceSvg): string | null {
  registerGenerators()

  const topBlocks = workspace.getTopBlocks(false)
  const tradeDef = topBlocks.find((b) => b.type === 'trade_definition')
  const beforePurchase = topBlocks.find((b) => b.type === 'before_purchase')
  const duringPurchase = topBlocks.find((b) => b.type === 'during_purchase')
  const afterPurchase = topBlocks.find((b) => b.type === 'after_purchase')

  if (!beforePurchase || !afterPurchase) return null

  const initCode = tradeDef
    ? javascriptGenerator.statementToCode(tradeDef as Blockly.Block, 'INITIALIZATION')
    : ''

  const beforeCode = javascriptGenerator.statementToCode(
    beforePurchase as Blockly.Block,
    'BEFOREPURCHASE_STACK',
  )
  const afterCode = javascriptGenerator.statementToCode(
    afterPurchase as Blockly.Block,
    'AFTERPURCHASE_STACK',
  )

  let duringCode = ''
  if (duringPurchase) {
    duringCode = javascriptGenerator.statementToCode(
      duringPurchase as Blockly.Block,
      'DURING_PURCHASE_STACK',
    )
  }

  return `${initCode}
while (true) {
${beforeCode}
  while (Bot.isContractOpen()) {
${duringCode}
    await Bot.sleep(100);
  }
  const _action = await (async () => {
${afterCode}
  })();
  if (_action !== 'restart') break;
}`
}
