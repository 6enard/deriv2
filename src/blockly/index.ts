// Blockly loader — initializes the Blockly theme, registers custom blocks,
// and provides a factory for creating workspaces.
// Ported from deriv-com/bot's scratch/blockly.js, adapted for our stack.

import * as Blockly from 'blockly'
import 'blockly/blocks'
import { Colours, darkThemeOverrides } from './colours'
import {
  setGlobalMarketOptions,
  getFirstMarketValue,
  getFirstSubmarketValue,
  getFirstSymbolValue,
  getFirstTradeTypeCategoryValue,
  getFirstTradeTypeValue,
  getFirstContractTypeValue,
  isValidMarketValue,
  isValidSubmarketValue,
  isValidSymbolValue,
  isValidTradeTypeCategoryValue,
  isValidTradeTypeValue,
  isValidContractTypeValue,
  findPairedTradeTypeBlock,
  getPurchaseListOptions,
  type RawSymbol,
} from './blocks'
import { toolbox } from './toolbox'
import { defaultWorkspaceXml } from './defaultWorkspace'

let blocksRegistered = false
let themeRegistered = false

// Register our custom block colours on the Blockly global so block
// definitions that reference Blockly.Colours.* can find them.
function applyColours() {
  const B = Blockly as unknown as { Colours: Record<string, unknown> }
  B.Colours = Colours
}

function registerTheme() {
  if (themeRegistered) return
  const themes = Blockly.Themes as unknown as Record<string, Blockly.Theme>
  themes.dbot_dark = Blockly.Theme.defineTheme('dbot_dark', {
    name: 'dbot_dark',
    base: Blockly.Themes.Zelos,
    categoryStyles: {
      trade_parameters: { colour: Colours.RootBlock.colour },
      purchase_conditions: { colour: Colours.RootBlock.colour },
      sell_conditions: { colour: Colours.RootBlock.colour },
      trade_results: { colour: Colours.RootBlock.colour },
      technical_analysis: { colour: Colours.Base.colour },
      indicators: { colour: Colours.Base.colour },
      time: { colour: Colours.Base.colour },
      candle: { colour: Colours.Base.colour },
      miscellaneous: { colour: Colours.Base.colour },
      math: { colour: '#5b80a5' },
      logic: { colour: '#5b80a5' },
      text: { colour: '#5ba55b' },
      lists: { colour: '#745ba5' },
      loops: { colour: '#5ba55b' },
    },
    componentStyles: {
      toolboxBackgroundColour: darkThemeOverrides.toolboxBackground,
      flyoutBackgroundColour: darkThemeOverrides.flyoutBackground,
      flyoutOpacity: darkThemeOverrides.flyoutOpacity,
      scrollbarColour: darkThemeOverrides.scrollbarColour,
      insertionMarkerColour: darkThemeOverrides.insertionMarkerColour,
      insertionMarkerOpacity: darkThemeOverrides.insertionMarkerOpacity,
      cursorColour: darkThemeOverrides.cursorColour,
    },
  })
  themeRegistered = true
}

export function ensureRegistered() {
  applyColours()
  if (!blocksRegistered) {
    // blocks.ts imports have side effects — they register on Blockly.Blocks.
    // The import at the top of this file handles that on first load.
    blocksRegistered = true
  }
  registerTheme()
}

export function createWorkspace(container: HTMLElement): Blockly.WorkspaceSvg {
  ensureRegistered()

  const workspace = Blockly.inject(container, {
    toolbox,
    theme: 'dbot_dark',
    media: '/blockly-media/',
    grid: {
      spacing: 28,
      length: 3,
      colour: '#262626',
      snap: true,
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 0.95,
      maxScale: 2,
      minScale: 0.5,
      scaleSpeed: 1.2,
    },
    trashcan: true,
    move: {
      scrollbars: true,
      drag: true,
      wheel: true,
    },
    renderer: 'zelos',
    sounds: false,
  })

  return workspace
}

export function loadDefaultWorkspace(workspace: Blockly.WorkspaceSvg) {
  Blockly.Xml.domToWorkspace(
    Blockly.utils.xml.textToDom(defaultWorkspaceXml),
    workspace,
  )
}

export function workspaceToXml(workspace: Blockly.WorkspaceSvg): string {
  const dom = Blockly.Xml.workspaceToDom(workspace)
  return Blockly.Xml.domToText(dom)
}

export function loadFromXml(workspace: Blockly.WorkspaceSvg, xmlText: string): boolean {
  try {
    workspace.clear()
    const dom = Blockly.utils.xml.textToDom(xmlText)
    Blockly.Xml.domToWorkspace(dom, workspace)
    return true
  } catch {
    return false
  }
}

export function isValidBotXml(xmlText: string): boolean {
  try {
    Blockly.utils.xml.textToDom(xmlText)
    return true
  } catch {
    return false
  }
}

export interface TradeParams {
  symbol: string
  contract_type: string
  trade_type: string
  duration: number
  duration_unit: string
  amount: number
  currency: string
  prediction?: number
}

export type TradeParamsResult =
  | { ok: true; params: TradeParams; repairedInputs: string[] }
  | { ok: false; missingField: string }

function readOrRepairNumberInput(
  workspace: Blockly.WorkspaceSvg,
  block: Blockly.Block,
  inputName: string,
  fallback: number,
): { value: number; repaired: boolean } {
  const input = block.getInput(inputName)
  let target = block.getInputTargetBlock(inputName)
  let raw = target?.getFieldValue('NUM')
  const isValid = raw !== null && raw !== undefined && raw !== '' && !isNaN(parseFloat(raw))

  if (!isValid) {
    if (target && target.type === 'math_number') {
      target.setFieldValue(String(fallback), 'NUM')
    } else {
      if (target) {
        input?.connection?.disconnect()
        target.dispose(false)
      }
      const shadow = workspace.newBlock('math_number')
      shadow.setFieldValue(String(fallback), 'NUM')
      shadow.initSvg()
      input?.connection?.connect(shadow.outputConnection)
    }
    target = block.getInputTargetBlock(inputName)
    raw = target?.getFieldValue('NUM')
    console.warn(`[bot-loader] ${inputName} was invalid at run time — auto-corrected to ${fallback}`)
    return { value: parseFloat(String(raw ?? fallback)), repaired: true }
  }

  return { value: parseFloat(String(raw)), repaired: false }
}

export function extractTradeParams(workspace: Blockly.WorkspaceSvg): TradeParamsResult {
  const topBlocks = workspace.getTopBlocks(false)
  const root = topBlocks.find((b) => b.type === 'trade_definition')
  if (!root) return { ok: false, missingField: 'trade_definition' }

  const tradeOptionsBlock = root.getInputTargetBlock('TRADE_OPTIONS')
  if (!tradeOptionsBlock) return { ok: false, missingField: 'trade_definition' }

  let symbol = ''
  let contractType = ''
  let tradeType = ''

  let block: Blockly.Block | null = tradeOptionsBlock
  while (block) {
    if (block.type === 'trade_definition_market') {
      symbol = String(block.getFieldValue('SYMBOL_LIST') || '').trim()
    } else if (block.type === 'trade_definition_tradetype') {
      tradeType = String(block.getFieldValue('TRADETYPE_LIST') || '').trim()
    } else if (block.type === 'trade_definition_contracttype') {
      contractType = String(block.getFieldValue('TYPE_LIST') || '').trim()
    }
    block = block.getNextBlock()
  }

  if (!symbol) return { ok: false, missingField: 'symbol' }
  if (!contractType) return { ok: false, missingField: 'contract_type' }

  const tradeOptionsParamsBlock = root.getInputTargetBlock('SUBMARKET')
  if (!tradeOptionsParamsBlock || tradeOptionsParamsBlock.type !== 'trade_definition_tradeoptions') {
    return { ok: false, missingField: 'trade_options' }
  }

  const durationUnit = String(tradeOptionsParamsBlock.getFieldValue('DURATIONTYPE_LIST') || '').trim()
  const currency = String(tradeOptionsParamsBlock.getFieldValue('CURRENCY_LIST') || '').trim()

  const durationResult = readOrRepairNumberInput(workspace, tradeOptionsParamsBlock, 'DURATION', 5)
  const amountResult = readOrRepairNumberInput(workspace, tradeOptionsParamsBlock, 'AMOUNT', 1)
  const predictionResult = readOrRepairNumberInput(workspace, tradeOptionsParamsBlock, 'PREDICTION', 5)

  const prediction = predictionResult.value
  const digitContractsRequiringPrediction = ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER']
  if (digitContractsRequiringPrediction.includes(contractType) && isNaN(prediction)) {
    return { ok: false, missingField: 'prediction' }
  }

  if (!durationUnit) return { ok: false, missingField: 'duration_unit' }
  if (!currency) return { ok: false, missingField: 'currency' }

  const repairedInputs: string[] = []
  if (durationResult.repaired) repairedInputs.push('Duration')
  if (amountResult.repaired) repairedInputs.push('Amount')
  if (predictionResult.repaired) repairedInputs.push('Prediction')

  return { ok: true, params: { symbol, contract_type: contractType, trade_type: tradeType, duration: durationResult.value, duration_unit: durationUnit, amount: amountResult.value, currency, prediction: isNaN(prediction) ? undefined : prediction }, repairedInputs }
}

// Renamed/deprecated block types that may appear in bots saved earlier in
// this project's history. Keep this as an explicit, extensible list so old
// saved bots stay compatible after block renames.
const DEPRECATED_BLOCK_RENAMES: Record<string, string> = {
  // math_number_positive was used before being replaced by the standard math_number block.
  math_number_positive: 'math_number',
  // check_result was the original name; real bot.deriv.com XML uses contract_check_result.
  check_result: 'contract_check_result',
  // tickdelay was the original name; real bot.deriv.com XML uses tick_delay.
  tickdelay: 'tick_delay',
}

// Renamed field names that may appear in bots saved earlier in this
// project's history. Scoped to specific block types so we don't accidentally
// rename a field that happens to share a name on an unrelated block.
const DEPRECATED_FIELD_RENAMES: { blockType: string; oldName: string; newName: string }[] = [
  // read_details used 'DETAILS' before being aligned to real bot.deriv.com XML ('DETAIL_INDEX').
  { blockType: 'read_details', oldName: 'DETAILS', newName: 'DETAIL_INDEX' },
  // tick_delay: TICKS → TICKDELAYVALUE (value input renamed to match real XML).
  { blockType: 'tick_delay', oldName: 'TICKS', newName: 'TICKDELAYVALUE' },
  // tick_delay: TIMEOUTSTACK → TICKDELAYSTACK (statement input renamed; was
  // incorrectly reusing the timeout block's stack name).
  { blockType: 'tick_delay', oldName: 'TIMEOUTSTACK', newName: 'TICKDELAYSTACK' },
  // console: VALUE → MESSAGE (value input renamed to match real XML).
  { blockType: 'console', oldName: 'VALUE', newName: 'MESSAGE' },
]

// Field-value normalizations for fields whose type changed. When a field
// was a dropdown and becomes a checkbox, old bots may contain the dropdown's
// value (e.g. 'TRUE'/'FALSE') instead of the checkbox's lowercase 'true'/'false'.
// Scoped to block type + field name so we only touch the right field.
const FIELD_VALUE_NORMALIZATIONS: { blockType: string; fieldName: string; valueMap: Record<string, string> }[] = [
  // trade_definition_restartbuysell: dropdown → checkbox
  { blockType: 'trade_definition_restartbuysell', fieldName: 'TIME_MACHINE_ENABLED', valueMap: { TRUE: 'true', FALSE: 'false' } },
  // trade_definition_restartonerror: dropdown → checkbox
  { blockType: 'trade_definition_restartonerror', fieldName: 'RESTARTONERROR', valueMap: { TRUE: 'true', FALSE: 'false' } },
]

export function sanitizeLegacyXml(xml: string): string {
  let sanitized = xml
  for (const [oldType, newType] of Object.entries(DEPRECATED_BLOCK_RENAMES)) {
    sanitized = sanitized.replaceAll(`type="${oldType}"`, `type="${newType}"`)
  }
  for (const { blockType, oldName, newName } of DEPRECATED_FIELD_RENAMES) {
    // Field elements look like <field name="DETAILS">5</field>. Only rename
    // when the enclosing block is blockType. We do a lightweight scan: split
    // on block boundaries and rewrite matching field names within.
    const blockOpen = `<block type="${blockType}"`
    const blockClose = `</block>`
    let result = ''
    let cursor = 0
    while (cursor < sanitized.length) {
      const openIdx = sanitized.indexOf(blockOpen, cursor)
      if (openIdx === -1) {
        result += sanitized.slice(cursor)
        break
      }
      result += sanitized.slice(cursor, openIdx)
      const closeIdx = sanitized.indexOf(blockClose, openIdx)
      if (closeIdx === -1) {
        result += sanitized.slice(openIdx)
        break
      }
      const blockSegment = sanitized.slice(openIdx, closeIdx + blockClose.length)
      result += blockSegment.replaceAll(`name="${oldName}"`, `name="${newName}"`)
      cursor = closeIdx + blockClose.length
    }
    sanitized = result
  }
  for (const { blockType, fieldName, valueMap } of FIELD_VALUE_NORMALIZATIONS) {
    // Rewrite field *values* for a specific field on a specific block type.
    // Field elements look like <field name="TIME_MACHINE_ENABLED">TRUE</field>.
    const blockOpen = `<block type="${blockType}"`
    const blockClose = `</block>`
    let result = ''
    let cursor = 0
    while (cursor < sanitized.length) {
      const openIdx = sanitized.indexOf(blockOpen, cursor)
      if (openIdx === -1) {
        result += sanitized.slice(cursor)
        break
      }
      result += sanitized.slice(cursor, openIdx)
      const closeIdx = sanitized.indexOf(blockClose, openIdx)
      if (closeIdx === -1) {
        result += sanitized.slice(openIdx)
        break
      }
      let blockSegment = sanitized.slice(openIdx, closeIdx + blockClose.length)
      for (const [oldVal, newVal] of Object.entries(valueMap)) {
        blockSegment = blockSegment.replaceAll(`name="${fieldName}">${oldVal}</field>`, `name="${fieldName}">${newVal}</field>`)
      }
      result += blockSegment
      cursor = closeIdx + blockClose.length
    }
    sanitized = result
  }
  return sanitized
}

// Self-healing pass after a bot is loaded. Repairs missing/empty fields and
// inputs so the bot is runnable instead of failing with a missing-value error.
// Returns true if anything was auto-repaired (used to surface a toast).
function repairLoadedBot(workspace: Blockly.WorkspaceSvg): boolean {
  let repaired = false
  const allBlocks = workspace.getAllBlocks(false)

  // 1. Repair missing OR unreadable AMOUNT / DURATION / PREDICTION number
  //    inputs on every tradeoptions block.
  for (const block of allBlocks) {
    if (block.type !== 'trade_definition_tradeoptions') continue
    for (const inputName of ['AMOUNT', 'DURATION', 'PREDICTION'] as const) {
      const target = block.getInputTargetBlock(inputName)
      const raw = target?.getFieldValue('NUM')
      const isValid = raw !== null && raw !== undefined && raw !== '' && !isNaN(parseFloat(raw))
      if (isValid) continue
      if (target && target.type === 'math_number') {
        target.setFieldValue('1', 'NUM')
        repaired = true
        console.warn(`[bot-loader] auto-repaired invalid ${inputName} value on trade_definition_tradeoptions`)
        continue
      }
      // Disconnect and dispose of whatever's currently connected (any type)
      // before attaching a fresh shadow — otherwise connect() silently fails
      // on an already-occupied input.
      const input = block.getInput(inputName)
      if (target) {
        console.warn(`[bot-loader] ${inputName} had an unreadable block of type '${target.type}' — replacing it`)
        input?.connection?.disconnect()
        target.dispose(false)
      }
      const shadow = workspace.newBlock('math_number')
      const defaultVal = inputName === 'PREDICTION' ? '5' : '1'
      shadow.setFieldValue(defaultVal, 'NUM')
      shadow.initSvg()
      input?.connection?.connect(shadow.outputConnection)
      if (input?.connection?.targetBlock() === shadow) {
        console.warn(`[bot-loader] auto-repaired missing ${inputName} input on trade_definition_tradeoptions`)
        repaired = true
      } else {
        console.error(`[bot-loader] FAILED to repair ${inputName} — connection did not attach after disconnect`)
      }
    }
  }

  // Diagnostic: log the final readable state of AMOUNT/DURATION/PREDICTION
  // inputs so any future repair failure shows definitively what's connected
  // and why.
  for (const block of allBlocks) {
    if (block.type !== 'trade_definition_tradeoptions') continue
    for (const inputName of ['AMOUNT', 'DURATION', 'PREDICTION'] as const) {
      const t = block.getInputTargetBlock(inputName)
      console.warn(`[bot-loader] post-repair ${inputName}:`, { input: inputName, targetType: t?.type, value: t?.getFieldValue('NUM') })
    }
  }

  // 2. Repair empty OR stale/invalid market/type dropdown fields with the first
  // available valid option. A stale saved value (e.g. a symbol no longer returned
  // by the current market fetch) poisons the whole Market → Submarket → Symbol
  // cascade, so we validate against the current options, not just emptiness.
  for (const block of allBlocks) {
    if (block.type === 'trade_definition_market') {
      const market = String(block.getFieldValue('MARKET_LIST') || '').trim()
      if (!market || !isValidMarketValue(market)) {
        const v = getFirstMarketValue()
        if (v) { block.setFieldValue(v, 'MARKET_LIST'); repaired = true; console.warn(`[bot-loader] MARKET_LIST was '${market}' (not found in current data) — reset to '${v}'`) }
      }
      const effectiveMarket = String(block.getFieldValue('MARKET_LIST') || '').trim()
      const submarket = String(block.getFieldValue('SUBMARKET_LIST') || '').trim()
      if (!submarket || !isValidSubmarketValue(effectiveMarket, submarket)) {
        const v = getFirstSubmarketValue(effectiveMarket)
        if (v) { block.setFieldValue(v, 'SUBMARKET_LIST'); repaired = true; console.warn(`[bot-loader] SUBMARKET_LIST was '${submarket}' (not found in current data) — reset to '${v}'`) }
      }
      const effectiveSubmarket = String(block.getFieldValue('SUBMARKET_LIST') || '').trim()
      const symbol = String(block.getFieldValue('SYMBOL_LIST') || '').trim()
      if (!symbol || !isValidSymbolValue(effectiveSubmarket, symbol)) {
        const v = getFirstSymbolValue(effectiveSubmarket)
        if (v) { block.setFieldValue(v, 'SYMBOL_LIST'); repaired = true; console.warn(`[bot-loader] SYMBOL_LIST was '${symbol}' (not found in current data) — reset to '${v}'`) }
      }
    } else if (block.type === 'trade_definition_tradetype') {
      const cat = String(block.getFieldValue('TRADETYPECAT_LIST') || '').trim()
      if (!cat || !isValidTradeTypeCategoryValue(cat)) {
        const v = getFirstTradeTypeCategoryValue()
        if (v) { block.setFieldValue(v, 'TRADETYPECAT_LIST'); repaired = true; console.warn(`[bot-loader] TRADETYPECAT_LIST was '${cat}' (invalid) — reset to '${v}'`) }
      }
      const effectiveCat = String(block.getFieldValue('TRADETYPECAT_LIST') || '').trim()
      const tt = String(block.getFieldValue('TRADETYPE_LIST') || '').trim()
      if (!tt || !isValidTradeTypeValue(effectiveCat, tt)) {
        const v = getFirstTradeTypeValue(effectiveCat)
        if (v) { block.setFieldValue(v, 'TRADETYPE_LIST'); repaired = true; console.warn(`[bot-loader] TRADETYPE_LIST was '${tt}' (invalid for category '${effectiveCat}') — reset to '${v}'`) }
      }
    }
  }

  // 3. Repair contract type — depends on the trade type resolved above.
  //    Process AFTER the tradetype pass so TRADETYPE_LIST is already valid.
  //    Each contracttype block reads its paired tradetype block via the
  //    same backward-walk used by the dropdown function.
  for (const block of allBlocks) {
    if (block.type !== 'trade_definition_contracttype') continue
    const paired = findPairedTradeTypeBlock(block)
    const resolvedTradeType = paired
      ? String(paired.getFieldValue('TRADETYPE_LIST') || '').trim()
      : ''
    const ct = String(block.getFieldValue('TYPE_LIST') || '').trim()
    if (!ct || !isValidContractTypeValue(resolvedTradeType, ct)) {
      const v = getFirstContractTypeValue(resolvedTradeType)
      if (v) { block.setFieldValue(v, 'TYPE_LIST'); repaired = true; console.warn(`[bot-loader] TYPE_LIST was '${ct}' (invalid for trade type '${resolvedTradeType}') — reset to '${v}'`) }
    }
  }

  // 4. Repair purchase blocks — PURCHASE_LIST must match one of the concrete
  //    contract types derived from the (now-repaired) trade type and contract
  //    type. A stale or 'both' value can never be purchased, so reset it to
  //    the first available real option.
  const purchaseOptions = getPurchaseListOptions(workspace)
  const validPurchaseValues = new Set(purchaseOptions.map(([, v]) => v))
  for (const block of allBlocks) {
    if (block.type !== 'purchase') continue
    const pl = String(block.getFieldValue('PURCHASE_LIST') || '').trim()
    if (!pl || !validPurchaseValues.has(pl)) {
      const v = purchaseOptions[0]?.[1] ?? ''
      if (v) { block.setFieldValue(v, 'PURCHASE_LIST'); repaired = true; console.warn(`[bot-loader] PURCHASE_LIST was '${pl}' (invalid for current contract type) — reset to '${v}'`) }
    }
  }

  return repaired
}

export async function loadBotXmlSafely(
  workspace: Blockly.WorkspaceSvg,
  xml: string,
  fetchSymbolsIfNeeded: () => Promise<RawSymbol[] | null>,
  currentlyLoadedSymbols: RawSymbol[] | null,
): Promise<{ ok: true; repaired: boolean } | { ok: false; reason: string }> {
  let symbols = currentlyLoadedSymbols
  if (!symbols || symbols.length === 0) {
    symbols = await fetchSymbolsIfNeeded()
  }
  if (!symbols || symbols.length === 0) {
    return { ok: false, reason: 'Could not load market data.' }
  }

  setGlobalMarketOptions(symbols)
  const sanitized = sanitizeLegacyXml(xml)
  const loaded = loadFromXml(workspace, sanitized)
  if (!loaded) {
    return { ok: false, reason: 'This file is not a valid bot.' }
  }

  // Diagnostic: log the raw saved field values before repair so any future
  // load failure shows exactly what was saved vs. what the repair chose.
  // Gated behind a debug flag so it can stay in place harmlessly.
  const BOT_LOADER_DEBUG = true
  if (BOT_LOADER_DEBUG) {
    const topBlocks = workspace.getTopBlocks(false)
    const root = topBlocks.find((b) => b.type === 'trade_definition')
    const tradeOptionsBlock = root?.getInputTargetBlock('TRADE_OPTIONS')
    let b: Blockly.Block | null = tradeOptionsBlock ?? null
    while (b) {
      if (b.type === 'trade_definition_market') {
        console.warn('[bot-loader] raw saved fields — MARKET_LIST:', JSON.stringify(b.getFieldValue('MARKET_LIST')), 'SUBMARKET_LIST:', JSON.stringify(b.getFieldValue('SUBMARKET_LIST')), 'SYMBOL_LIST:', JSON.stringify(b.getFieldValue('SYMBOL_LIST')))
        break
      }
      b = b.getNextBlock()
    }
  }

  const repaired = repairLoadedBot(workspace)
  if (BOT_LOADER_DEBUG) {
    const topBlocks = workspace.getTopBlocks(false)
    const root = topBlocks.find((b) => b.type === 'trade_definition')
    const tradeOptionsBlock = root?.getInputTargetBlock('TRADE_OPTIONS')
    let b: Blockly.Block | null = tradeOptionsBlock ?? null
    while (b) {
      if (b.type === 'trade_definition_market') {
        console.warn('[bot-loader] post-repair fields — MARKET_LIST:', JSON.stringify(b.getFieldValue('MARKET_LIST')), 'SUBMARKET_LIST:', JSON.stringify(b.getFieldValue('SUBMARKET_LIST')), 'SYMBOL_LIST:', JSON.stringify(b.getFieldValue('SYMBOL_LIST')))
        break
      }
      b = b.getNextBlock()
    }
  }
  return { ok: true, repaired }
}

export { defaultWorkspaceXml } from './defaultWorkspace'
export { generateBotCode, registerGenerators } from './generators'
export { createBotApi, type BotApi, type BotApiOptions, type NotificationType, type NotifyData } from './botApi'
export { setGlobalMarketOptions, getPurchaseListOptions, type RawSymbol } from './blocks'
