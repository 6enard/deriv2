// Blockly loader — initializes the Blockly theme, registers custom blocks,
// and provides a factory for creating workspaces.
// Ported from deriv-com/bot's scratch/blockly.js, adapted for our stack.

import * as Blockly from 'blockly'
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

export { defaultWorkspaceXml } from './defaultWorkspace'
