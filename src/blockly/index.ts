// Blockly loader — initializes the Blockly theme, registers custom blocks,
// and provides a factory for creating workspaces.
// Ported from deriv-com/bot's scratch/blockly.js, adapted for our stack.

import * as Blockly from 'blockly'
import 'blockly/blocks'
import { Colours, darkThemeOverrides } from './colours'
import './blocks'
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

export interface TradeParams {
  symbol: string
  contract_type: string
  duration: number
  duration_unit: string
  amount: number
  currency: string
}

function readNumberInput(block: Blockly.Block, inputName: string): number | null {
  const target = block.getInputTargetBlock(inputName)
  if (!target) return null
  const raw = target.getFieldValue('NUM')
  if (raw === null || raw === undefined || raw === '') return null
  const num = parseFloat(raw)
  return isNaN(num) ? null : num
}

export function extractTradeParams(workspace: Blockly.WorkspaceSvg): TradeParams | null {
  const topBlocks = workspace.getTopBlocks(false)
  const root = topBlocks.find((b) => b.type === 'trade_definition')
  if (!root) return null

  const tradeOptionsBlock = root.getInputTargetBlock('TRADE_OPTIONS')
  if (!tradeOptionsBlock) return null

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

  const tradeOptionsParamsBlock = root.getInputTargetBlock('SUBMARKET')
  if (!tradeOptionsParamsBlock || tradeOptionsParamsBlock.type !== 'trade_definition_tradeoptions') return null

  const durationUnit = String(tradeOptionsParamsBlock.getFieldValue('DURATIONTYPE_LIST') || '').trim()
  const duration = readNumberInput(tradeOptionsParamsBlock, 'DURATION')
  const amount = readNumberInput(tradeOptionsParamsBlock, 'AMOUNT')
  const currency = String(tradeOptionsParamsBlock.getFieldValue('CURRENCY_LIST') || '').trim()

  if (!symbol || !contractType || !durationUnit || duration === null || amount === null || !currency) {
    return null
  }

  return { symbol, contract_type: contractType, duration, duration_unit: durationUnit, amount, currency }
}

export function populateMarketDropdowns(workspace: Blockly.WorkspaceSvg, rawSymbols: any[]): boolean {
  const markets: [string, string][] = []
  const submarketsByMarket = new Map<string, [string, string][]>()
  const symbolsBySubmarket = new Map<string, [string, string][]>()

  for (const s of rawSymbols) {
    const market = s.market
    const marketDisplay = s.market_display_name ?? market
    const submarket = s.submarket
    const submarketDisplay = s.submarket_display_name ?? submarket
    const symbol = s.underlying_symbol ?? s.symbol
    const symbolDisplay = s.underlying_symbol_name ?? s.display_name ?? symbol

    if (!submarketsByMarket.has(market)) {
      submarketsByMarket.set(market, [])
      markets.push([marketDisplay, market])
    }
    const subList = submarketsByMarket.get(market)!
    if (!subList.find(sm => sm[1] === submarket)) {
      subList.push([submarketDisplay, submarket])
    }
    if (!symbolsBySubmarket.has(submarket)) {
      symbolsBySubmarket.set(submarket, [])
    }
    symbolsBySubmarket.get(submarket)!.push([symbolDisplay, symbol])
  }

  if (markets.length === 0) return false

  const allBlocks = workspace.getAllBlocks()
  const marketBlocks = allBlocks.filter(b => b.type === 'trade_definition_market')

  for (const block of marketBlocks) {
    const marketField = block.getField('MARKET_LIST') as any
    const submarketField = block.getField('SUBMARKET_LIST') as any
    const symbolField = block.getField('SYMBOL_LIST') as any

    if (marketField) {
      marketField.menuGenerator_ = markets
      marketField.generatedOptions = null
      marketField.setValidator(function (this: any, newValue: string): string {
        const sf = this.sourceBlock_.getField('SUBMARKET_LIST') as any
        const subs = submarketsByMarket.get(newValue) || []
        if (subs.length > 0 && !subs.find(s => s[1] === sf.getValue())) {
          sf.setValue(subs[0][1])
        }
        return newValue
      })
    }
    if (submarketField) {
      submarketField.menuGenerator_ = function (this: any): [string, string][] {
        const sel = this.sourceBlock_.getFieldValue('MARKET_LIST')
        return submarketsByMarket.get(sel) || []
      }
      submarketField.generatedOptions = null
      submarketField.setValidator(function (this: any, newValue: string): string {
        const sf = this.sourceBlock_.getField('SYMBOL_LIST') as any
        const syms = symbolsBySubmarket.get(newValue) || []
        if (syms.length > 0 && !syms.find(s => s[1] === sf.getValue())) {
          sf.setValue(syms[0][1])
        }
        return newValue
      })
    }
    if (symbolField) {
      symbolField.menuGenerator_ = function (this: any): [string, string][] {
        const sel = this.sourceBlock_.getFieldValue('SUBMARKET_LIST')
        return symbolsBySubmarket.get(sel) || []
      }
      symbolField.generatedOptions = null
    }

    const firstSubs = submarketsByMarket.get(markets[0][1]) || []
    const firstSyms = firstSubs.length > 0 ? (symbolsBySubmarket.get(firstSubs[0][1]) || []) : []
    if (marketField && markets.length > 0) marketField.setValue(markets[0][1])
    if (submarketField && firstSubs.length > 0) submarketField.setValue(firstSubs[0][1])
    if (symbolField && firstSyms.length > 0) symbolField.setValue(firstSyms[0][1])
  }

  // TODO(phase3): fetch contract types from contracts_for_symbol endpoint for the selected symbol
  const contractTypeOptions: [string, string][] = [
    ['Rise', 'CALL'],
    ['Fall', 'PUT'],
    ['Touch', 'TOUCH'],
    ['No Touch', 'NOTOUCH'],
    ['Ends In', 'EXPIRYRANGE'],
    ['Ends Out', 'EXPIRYMISS'],
    ['Stays In', 'RANGE'],
    ['Goes Out', 'MISS'],
  ]
  for (const block of allBlocks.filter(b => b.type === 'trade_definition_contracttype')) {
    const f = block.getField('TYPE_LIST') as any
    if (f) {
      f.menuGenerator_ = contractTypeOptions
      f.generatedOptions = null
      f.setValue(contractTypeOptions[0][1])
    }
  }

  const tradeTypeCatOptions: [string, string][] = [
    ['Up/Down', 'updown'],
    ['Touch/No Touch', 'touchnotouch'],
    ['In/Out', 'inout'],
  ]
  for (const block of allBlocks.filter(b => b.type === 'trade_definition_tradetype')) {
    const catField = block.getField('TRADETYPECAT_LIST') as any
    if (catField) {
      catField.menuGenerator_ = tradeTypeCatOptions
      catField.generatedOptions = null
      catField.setValue(tradeTypeCatOptions[0][1])
    }
    const typeField = block.getField('TRADETYPE_LIST') as any
    if (typeField) {
      typeField.menuGenerator_ = [['Rise/Fall', 'risefall'], ['Higher/Lower', 'higherlower']]
      typeField.generatedOptions = null
      typeField.setValue('risefall')
    }
  }

  return true
}

export { defaultWorkspaceXml } from './defaultWorkspace'
export { generateBotCode, registerGenerators } from './generators'
export { createBotApi, type BotApi, type BotApiOptions, type NotificationType } from './botApi'
