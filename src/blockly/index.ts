import * as Blockly from 'blockly'
import 'blockly/blocks'

import { Colours, darkThemeOverrides } from './colours'

import {
  setGlobalMarketOptions,
  getPurchaseListOptions,
  type RawSymbol,
} from './blocks'

import { toolbox } from './toolbox'
import { defaultWorkspaceXml } from './defaultWorkspace'

let themeRegistered = false

function applyColours() {
  const B = Blockly as unknown as { Colours: Record<string, unknown> }
  B.Colours = Colours
}

function registerTheme() {
  if (themeRegistered) return

  Blockly.Theme.defineTheme('dbot_dark', {
    name: 'dbot_dark',
    base: Blockly.Themes.Zelos,

    categoryStyles: {
      trade_parameters: { colour: Colours.RootBlock.colour },
      purchase_conditions: { colour: Colours.RootBlock.colour },
      sell_conditions: { colour: Colours.RootBlock.colour },
      trade_results: { colour: Colours.RootBlock.colour },
      analysis: { colour: Colours.Base.colour },
      utility: { colour: Colours.Base.colour },
      technical_analysis: { colour: Colours.Base.colour },
      indicators: { colour: Colours.Base.colour },
      time: { colour: Colours.Base.colour },
      candle: { colour: Colours.Base.colour },
      miscellaneous: { colour: Colours.Base.colour },
      math: { colour: '#3b5266' },
      logic: { colour: '#3b5266' },
      text: { colour: '#3b6b3b' },
      lists: { colour: '#4a3b66' },
      loops: { colour: '#3b6b3b' },
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
  registerTheme()
}

export function createWorkspace(container: HTMLElement): Blockly.WorkspaceSvg {
  ensureRegistered()

  const mobile =
    typeof window !== 'undefined' &&
    window.innerWidth < 1024

  return Blockly.inject(container, {
    toolbox,
    theme: 'dbot_dark',
    renderer: 'zelos',
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
      startScale: mobile ? 0.75 : 0.95,
      maxScale: 2,
      minScale: 0.4,
      scaleSpeed: 1.2,
    },

    move: {
      drag: true,
      wheel: true,
      scrollbars: true,
    },

    trashcan: true,
    sounds: false,
  })
}

export function loadDefaultWorkspace(workspace: Blockly.WorkspaceSvg) {
  workspace.clear()

  const dom =
    Blockly.utils.xml.textToDom(defaultWorkspaceXml)

  Blockly.Xml.domToWorkspace(dom, workspace)
}

export function workspaceToXml(workspace: Blockly.WorkspaceSvg) {
  return Blockly.Xml.domToText(
    Blockly.Xml.workspaceToDom(workspace),
  )
}

/* ---------------------------------------------------------
   XML MIGRATION
--------------------------------------------------------- */

const BLOCK_RENAMES: Record<string, string> = {
  trade: 'trade_definition',
  tradeOptions: 'trade_definition_tradeoptions',
  market: 'trade_definition_market',
  check_result: 'contract_check_result',
  tickdelay: 'tick_delay',
  math_number_positive: 'math_number',
}

const FIELD_RENAMES: Record<string, Record<string, string>> = {
  read_details: {
    DETAILS: 'DETAIL_INDEX',
  },

  tick_delay: {
    TICKS: 'TICKDELAYVALUE',
    TIMEOUTSTACK: 'TICKDELAYSTACK',
  },

  console: {
    VALUE: 'MESSAGE',
  },
}

function renameBlocks(root: Element) {
  const blocks = Array.from(
    root.querySelectorAll('block,shadow'),
  ) as Element[]

  blocks.forEach((block) => {
    const type = block.getAttribute('type')
    if (!type) return

    if (BLOCK_RENAMES[type]) {
      block.setAttribute(
        'type',
        BLOCK_RENAMES[type],
      )
    }
  })
}

function renameFields(root: Element) {
  const blocks = Array.from(
    root.querySelectorAll('block,shadow'),
  ) as Element[]

  blocks.forEach((block) => {
    const type = block.getAttribute('type')
    if (!type) return

    const map = FIELD_RENAMES[type]
    if (!map) return

    Array.from(block.children).forEach((child) => {
      if (child.tagName !== 'field') return

      const name = child.getAttribute('name')
      if (!name) return

      if (map[name]) {
        child.setAttribute(
          'name',
          map[name],
        )
      }
    })
  })
}

function normalizeCheckboxes(root: Element) {
  const targets = [
    ['trade_definition_restartbuysell', 'TIME_MACHINE_ENABLED'],
    ['trade_definition_restartonerror', 'RESTARTONERROR'],
    ['notify', 'NOTIFICATION_SOUND'],
  ]

  targets.forEach(([type, field]) => {
    root
      .querySelectorAll(`block[type="${type}"]`)
      .forEach((block) => {
        const el = Array.from(block.children).find(
          (c) =>
            c.tagName === 'field' &&
            c.getAttribute('name') === field,
        )

        if (!el) return

        const value =
          el.textContent?.trim().toUpperCase()

        if (value === 'TRUE') el.textContent = 'TRUE'
        if (value === 'FALSE') el.textContent = 'FALSE'
      })
  })
}

function migrateLegacyTrade(root: Element) {
  const legacyTrades = Array.from(
    root.querySelectorAll('block[type="trade_definition"]'),
  )

  legacyTrades.forEach((trade) => {
    const hasTradeStack =
      trade.querySelector(
        ':scope > statement[name="TRADE_OPTIONS"]',
      )

    if (hasTradeStack) return

    const fields = new Map<string, string>()

    Array.from(trade.children).forEach((child) => {
      if (child.tagName === 'field') {
        fields.set(
          child.getAttribute('name') || '',
          child.textContent || '',
        )
      }
    })

    if (!fields.size) return

    const doc = trade.ownerDocument!

    const statement =
      doc.createElement('statement')

    statement.setAttribute(
      'name',
      'TRADE_OPTIONS',
    )

    const market =
      doc.createElement('block')

    market.setAttribute(
      'type',
      'trade_definition_market',
    )

    const addField = (
      parent: Element,
      name: string,
      value: string,
    ) => {
      const f =
        doc.createElement('field')
      f.setAttribute('name', name)
      f.textContent = value
      parent.appendChild(f)
    }

    addField(
      market,
      'MARKET_LIST',
      fields.get('MARKET_LIST') || '',
    )

    addField(
      market,
      'SUBMARKET_LIST',
      fields.get('SUBMARKET_LIST') || '',
    )

    addField(
      market,
      'SYMBOL_LIST',
      fields.get('SYMBOL_LIST') || '',
    )

    const tradeType =
      doc.createElement('block')

    tradeType.setAttribute(
      'type',
      'trade_definition_tradetype',
    )

    addField(
      tradeType,
      'TRADETYPECAT_LIST',
      fields.get('TRADETYPECAT_LIST') || '',
    )

    addField(
      tradeType,
      'TRADETYPE_LIST',
      fields.get('TRADETYPE_LIST') || '',
    )

    const contract =
      doc.createElement('block')

    contract.setAttribute(
      'type',
      'trade_definition_contracttype',
    )

    addField(
      contract,
      'TYPE_LIST',
      fields.get('TYPE_LIST') || '',
    )

    const candle =
      doc.createElement('block')

    candle.setAttribute(
      'type',
      'trade_definition_candleinterval',
    )

    addField(
      candle,
      'CANDLEINTERVAL_LIST',
      fields.get('CANDLEINTERVAL_LIST') || '60',
    )

    const restartBuy =
      doc.createElement('block')

    restartBuy.setAttribute(
      'type',
      'trade_definition_restartbuysell',
    )

    addField(
      restartBuy,
      'TIME_MACHINE_ENABLED',
      fields.get('TIME_MACHINE_ENABLED') || 'FALSE',
    )

    const restartError =
      doc.createElement('block')

    restartError.setAttribute(
      'type',
      'trade_definition_restartonerror',
    )

    addField(
      restartError,
      'RESTARTONERROR',
      fields.get('RESTARTONERROR') || 'TRUE',
    )

    const next1 =
      doc.createElement('next')
    next1.appendChild(tradeType)
    market.appendChild(next1)

    const next2 =
      doc.createElement('next')
    next2.appendChild(contract)
    tradeType.appendChild(next2)

    const next3 =
      doc.createElement('next')
    next3.appendChild(candle)
    contract.appendChild(next3)

    const next4 =
      doc.createElement('next')
    next4.appendChild(restartBuy)
    candle.appendChild(next4)

    const next5 =
      doc.createElement('next')
    next5.appendChild(restartError)
    restartBuy.appendChild(next5)

    statement.appendChild(market)

    Array.from(trade.children)
      .filter(
        (c) => c.tagName === 'field',
      )
      .forEach((c) => trade.removeChild(c))

    trade.insertBefore(
      statement,
      trade.firstChild,
    )
  })
}

function migrateXml(dom: Document) {
  const root = dom.documentElement

  renameBlocks(root)
  renameFields(root)
  normalizeCheckboxes(root)
  migrateLegacyTrade(root)

  return dom
}

/* ---------------------------------------------------------
   LOAD XML
--------------------------------------------------------- */

export function loadFromXml(
  workspace: Blockly.WorkspaceSvg,
  xmlText: string,
) {
  try {
    const dom =
      Blockly.utils.xml.textToDom(xmlText)

    migrateXml(dom)

    workspace.clear()

    Blockly.Xml.domToWorkspace(
      dom,
      workspace,
    )

    Blockly.svgResize(workspace)

    return true
  } catch (error) {
    console.error(
      '[Bot XML Loader]',
      error,
    )
    return false
  }
}

export function isValidBotXml(xml: string) {
  try {
    Blockly.utils.xml.textToDom(xml)
    return true
  } catch {
    return false
  }
}

/* ---------------------------------------------------------
   TRADE PARAM EXTRACTION
--------------------------------------------------------- */

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
  | {
      ok: true
      params: TradeParams
      repairedInputs: string[]
    }
  | {
      ok: false
      missingField: string
    }

function numberValue(
  block: Blockly.Block,
  name: string,
) {
  const target =
    block.getInputTargetBlock(name)

  if (!target) return undefined

  const raw =
    target.getFieldValue('NUM')

  if (
    raw === undefined ||
    raw === null ||
    raw === ''
  ) {
    return undefined
  }

  const n = Number(raw)

  return Number.isFinite(n)
    ? n
    : undefined
}

export function extractTradeParams(
  workspace: Blockly.WorkspaceSvg,
): TradeParamsResult {
  const root =
    workspace
      .getTopBlocks(false)
      .find(
        (b) =>
          b.type === 'trade_definition',
      )

  if (!root)
    return {
      ok: false,
      missingField: 'trade_definition',
    }

  let symbol = ''
  let tradeType = ''
  let contractType = ''

  let block =
    root.getInputTargetBlock(
      'TRADE_OPTIONS',
    )

  while (block) {
    if (
      block.type ===
      'trade_definition_market'
    ) {
      symbol =
        String(
          block.getFieldValue(
            'SYMBOL_LIST',
          ) || '',
        )
    }

    if (
      block.type ===
      'trade_definition_tradetype'
    ) {
      tradeType =
        String(
          block.getFieldValue(
            'TRADETYPE_LIST',
          ) || '',
        )
    }

    if (
      block.type ===
      'trade_definition_contracttype'
    ) {
      contractType =
        String(
          block.getFieldValue(
            'TYPE_LIST',
          ) || '',
        )
    }

    block = block.getNextBlock()
  }

  if (!symbol)
    return {
      ok: false,
      missingField: 'symbol',
    }

  if (!contractType)
    return {
      ok: false,
      missingField: 'contract_type',
    }

  const options =
    root.getInputTargetBlock('SUBMARKET')

  if (
    !options ||
    options.type !==
      'trade_definition_tradeoptions'
  ) {
    return {
      ok: false,
      missingField: 'trade_options',
    }
  }

  const duration =
    numberValue(options, 'DURATION')

  const amount =
    numberValue(options, 'AMOUNT')

  const prediction =
    numberValue(options, 'PREDICTION')

  if (duration === undefined)
    return {
      ok: false,
      missingField: 'duration',
    }

  if (amount === undefined)
    return {
      ok: false,
      missingField: 'amount',
    }

  const durationUnit =
    String(
      options.getFieldValue(
        'DURATIONTYPE_LIST',
      ) || '',
    )

  const currency =
    String(
      options.getFieldValue(
        'CURRENCY_LIST',
      ) || '',
    )

  const requiresPrediction = [
    'DIGITMATCH',
    'DIGITDIFF',
    'DIGITOVER',
    'DIGITUNDER',
  ].includes(contractType)

  if (
    requiresPrediction &&
    prediction === undefined
  ) {
    return {
      ok: false,
      missingField: 'prediction',
    }
  }

  return {
    ok: true,
    params: {
      symbol,
      contract_type: contractType,
      trade_type: tradeType,
      duration,
      duration_unit: durationUnit,
      amount,
      currency,
      prediction,
    },
    repairedInputs: [],
  }
}

/* ---------------------------------------------------------
   SAFE IMPORT
--------------------------------------------------------- */

export async function loadBotXmlSafely(
  workspace: Blockly.WorkspaceSvg,
  xml: string,
  fetchSymbolsIfNeeded: () => Promise<RawSymbol[] | null>,
  currentlyLoadedSymbols: RawSymbol[] | null,
): Promise<
  | { ok: true; repaired: boolean }
  | { ok: false; reason: string }
> {
  try {
    let symbols =
      currentlyLoadedSymbols

    if (!symbols?.length) {
      symbols =
        await fetchSymbolsIfNeeded()
    }

    if (symbols?.length) {
      setGlobalMarketOptions(symbols)
    }

    const ok =
      loadFromXml(workspace, xml)

    if (!ok) {
      return {
        ok: false,
        reason:
          'Unable to load this Deriv bot XML.',
      }
    }

    return {
      ok: true,
      repaired: false,
    }
  } catch (error) {
    console.error(error)

    return {
      ok: false,
      reason:
        'Unexpected error while importing bot.',
    }
  }
}

export {
  defaultWorkspaceXml,
}

export {
  generateBotCode,
  registerGenerators,
} from './generators'

export {
  createBotApi,
  type BotApi,
  type BotApiOptions,
  type NotificationType,
  type NotifyData,
} from './botApi'

export {
  setGlobalMarketOptions,
  getPurchaseListOptions,
  type RawSymbol,
} from './blocks'