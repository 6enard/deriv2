// Blockly loader — initializes the Blockly theme, registers custom blocks,
// and provides a factory for creating workspaces.
// Ported from deriv-com/bot's scratch/blockly.js, adapted for our stack.

import * as Blockly from 'blockly'
import 'blockly/blocks'
import { Colours, darkThemeOverrides } from './colours'
import { setGlobalMarketOptions, type RawSymbol } from './blocks'
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

  if (!durationUnit) return { ok: false, missingField: 'duration_unit' }
  if (duration === null) return { ok: false, missingField: 'duration' }
  if (amount === null) return { ok: false, missingField: 'amount' }
  if (!currency) return { ok: false, missingField: 'currency' }

  return { ok: true, params: { symbol, contract_type: contractType, duration, duration_unit: durationUnit, amount, currency } }
}

export async function loadBotXmlSafely(
  workspace: Blockly.WorkspaceSvg,
  xml: string,
  fetchSymbolsIfNeeded: () => Promise<RawSymbol[] | null>,
  currentlyLoadedSymbols: RawSymbol[] | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let symbols = currentlyLoadedSymbols
  if (!symbols || symbols.length === 0) {
    symbols = await fetchSymbolsIfNeeded()
  }
  if (!symbols || symbols.length === 0) {
    return { ok: false, reason: 'Could not load market data.' }
  }

  setGlobalMarketOptions(symbols)
  const loaded = loadFromXml(workspace, xml)
  if (!loaded) {
    return { ok: false, reason: 'This file is not a valid bot.' }
  }

  return { ok: true }
}

export { defaultWorkspaceXml } from './defaultWorkspace'
export { generateBotCode, registerGenerators } from './generators'
export { createBotApi, type BotApi, type BotApiOptions, type NotificationType, type NotifyData } from './botApi'
export { setGlobalMarketOptions, type RawSymbol } from './blocks'
