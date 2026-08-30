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
  duration: number
  duration_unit: string
  amount: number
  currency: string
  prediction?: number
}

export type TradeParamsResult =
  | { ok: true; params: TradeParams }
  | { ok: false; missingField: string }

function readNumberInput(block: Blockly.Block, inputName: string): number | null {
  const target = block.getInputTargetBlock(inputName)
  if (!target) return null
  const raw = target.getFieldValue('NUM')
  if (raw === null || raw === undefined || raw === '') return null
  const num = parseFloat(raw)
  return isNaN(num) ? null : num
}

export function extractTradeParams(workspace: Blockly.WorkspaceSvg): TradeParamsResult {
  const topBlocks = workspace.getTopBlocks(false)
  const root = topBlocks.find((b) => b.type === 'trade_definition')
  if (!root) return { ok: false, missingField: 'trade_definition' }

  const tradeOptionsBlock = root.getInputTargetBlock('TRADE_OPTIONS')
  if (!tradeOptionsBlock) return { ok: false, missingField: 'trade_definition' }

  let symbol = ''
  let contractType = ''

  let block: Blockly.Block | null = tradeOptionsBlock
  while (block) {
    if (block.type === 'trade_definition_market') {
      symbol = String(block.getFieldValue('SYMBOL_LIST') || '').trim()
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
  const duration = readNumberInput(tradeOptionsParamsBlock, 'DURATION')
  const amount = readNumberInput(tradeOptionsParamsBlock, 'AMOUNT')
  const currency = String(tradeOptionsParamsBlock.getFieldValue('CURRENCY_LIST') || '').trim()

  const predictionRaw = tradeOptionsParamsBlock.getFieldValue('PREDICTION')
  const prediction = predictionRaw !== null && predictionRaw !== undefined && predictionRaw !== '' ? parseInt(String(predictionRaw), 10) : NaN
  const digitContractsRequiringPrediction = ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER']
  if (digitContractsRequiringPrediction.includes(contractType) && isNaN(prediction)) {
    return { ok: false, missingField: 'prediction' }
  }

  if (!durationUnit) return { ok: false, missingField: 'duration_unit' }
  if (duration === null) return { ok: false, missingField: 'duration' }
  if (amount === null) return { ok: false, missingField: 'amount' }
  if (!currency) return { ok: false, missingField: 'currency' }

  return { ok: true, params: { symbol, contract_type: contractType, duration, duration_unit: durationUnit, amount, currency, prediction: isNaN(prediction) ? undefined : prediction } }
}

// Renamed/deprecated block types that may appear in bots saved earlier in
// this project's history. Keep this as an explicit, extensible list so old
// saved bots stay compatible after block renames.
const DEPRECATED_BLOCK_RENAMES: Record<string, string> = {
  // math_number_positive was used before being replaced by the standard math_number block.
  math_number_positive: 'math_number',
}

export function sanitizeLegacyXml(xml: string): string {
  let sanitized = xml
  for (const [oldType, newType] of Object.entries(DEPRECATED_BLOCK_RENAMES)) {
    sanitized = sanitized.replaceAll(`type="${oldType}"`, `type="${newType}"`)
  }
  return sanitized
}

// Self-healing pass after a bot is loaded. Repairs missing/empty fields and
// inputs so the bot is runnable instead of failing with a missing-value error.
// Returns true if anything was auto-repaired (used to surface a toast).
function repairLoadedBot(workspace: Blockly.WorkspaceSvg): boolean {
  let repaired = false
  const allBlocks = workspace.getAllBlocks(false)

  // 1. Repair missing OR unreadable AMOUNT / DURATION number inputs, and
  //    validate the PREDICTION field, on every tradeoptions block.
  for (const block of allBlocks) {
    if (block.type !== 'trade_definition_tradeoptions') continue
    for (const inputName of ['AMOUNT', 'DURATION'] as const) {
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
      const shadow = workspace.newBlock('math_number')
      shadow.setFieldValue('1', 'NUM')
      shadow.initSvg()
      const input = block.getInput(inputName)
      input?.connection?.connect(shadow.outputConnection)
      if (input?.connection?.targetBlock() === shadow) {
        console.warn(`[bot-loader] auto-repaired missing ${inputName} input on trade_definition_tradeoptions`)
        repaired = true
      }
    }
    const predictionRaw = block.getFieldValue('PREDICTION')
    if (predictionRaw === null || predictionRaw === undefined || predictionRaw === '') {
      block.setFieldValue('5', 'PREDICTION')
      repaired = true
      console.warn('[bot-loader] PREDICTION was empty — reset to 5')
    } else {
      const predictionNum = parseFloat(String(predictionRaw))
      if (isNaN(predictionNum) || predictionNum < 0 || predictionNum > 9) {
        block.setFieldValue('5', 'PREDICTION')
        repaired = true
        console.warn(`[bot-loader] PREDICTION was '${predictionRaw}' (invalid) — reset to 5`)
      }
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
export { setGlobalMarketOptions, type RawSymbol } from './blocks'
