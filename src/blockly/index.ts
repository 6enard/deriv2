
import * as Blockly from 'blockly'
import 'blockly/blocks'

import { Colours, darkThemeOverrides } from './colours'
import {
  setGlobalMarketOptions,
  type RawSymbol,
} from './blocks'
import { toolbox } from './toolbox'
import { defaultWorkspaceXml } from './defaultWorkspace'

let themeRegistered = false

function applyColours() {
  const B = Blockly as unknown as {
    Colours: Record<string, unknown>
  }

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

export function createWorkspace(
  container: HTMLElement,
): Blockly.WorkspaceSvg {
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

export function loadDefaultWorkspace(
  workspace: Blockly.WorkspaceSvg,
) {
  workspace.clear()

  const dom = Blockly.utils.xml.textToDom(
    defaultWorkspaceXml,
  )

  Blockly.Xml.domToWorkspace(dom, workspace)
}

export function workspaceToXml(
  workspace: Blockly.WorkspaceSvg,
) {
  return Blockly.Xml.domToText(
    Blockly.Xml.workspaceToDom(workspace),
  )
}

/* =========================================================
   XML COMPATIBILITY
========================================================= */

const BLOCK_RENAMES: Record<string, string> = {
  trade: 'trade_definition',
  tradeOptions: 'trade_definition_tradeoptions',
  trade_options: 'trade_definition_tradeoptions',

  market: 'trade_definition_market',
  tradeMarket: 'trade_definition_market',

  tradeType: 'trade_definition_tradetype',
  trade_type: 'trade_definition_tradetype',

  contractType: 'trade_definition_contracttype',
  contract_type: 'trade_definition_contracttype',

  candleInterval: 'trade_definition_candleinterval',

  check_result: 'contract_check_result',
  contract_check_result: 'contract_check_result',

  tickdelay: 'tick_delay',
  tick_delay: 'tick_delay',

  math_number_positive: 'math_number',

  buy: 'purchase',
  purchase_conditions: 'before_purchase',
}

const FIELD_RENAMES: Record<
  string,
  Record<string, string>
> = {
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

  notify: {
    VALUE: 'MESSAGE',
  },

  contract_check_result: {
    RESULT: 'CHECK_RESULT',
    CHECKRESULT: 'CHECK_RESULT',
  },
}

const VALUE_FIELD_ALIASES: Record<string, string[]> = {
  DURATION: [
    'DURATION',
    'DURATION_VALUE',
    'DURATIONVALUE',
  ],

  AMOUNT: [
    'AMOUNT',
    'STAKE',
    'STAKE_AMOUNT',
    'AMOUNT_VALUE',
  ],

  PREDICTION: [
    'PREDICTION',
    'PREDICTION_VALUE',
  ],

  BARRIER: [
    'BARRIER',
    'BARRIER_VALUE',
  ],

  SECOND_BARRIER: [
    'SECOND_BARRIER',
    'SECONDBARRIER',
    'SECOND_BARRIER_VALUE',
  ],
}

function renameBlocks(root: Element) {
  const blocks = Array.from(
    root.querySelectorAll('block,shadow'),
  )

  for (const block of blocks) {
    const type = block.getAttribute('type')

    if (!type) continue

    const replacement = BLOCK_RENAMES[type]

    if (replacement) {
      block.setAttribute('type', replacement)
    }
  }
}

function renameFields(root: Element) {
  const blocks = Array.from(
    root.querySelectorAll('block,shadow'),
  )

  for (const block of blocks) {
    const type = block.getAttribute('type')

    if (!type) continue

    const mapping = FIELD_RENAMES[type]

    if (!mapping) continue

    for (const child of Array.from(block.children)) {
      if (child.tagName !== 'field') continue

      const name = child.getAttribute('name')

      if (!name) continue

      if (mapping[name]) {
        child.setAttribute(
          'name',
          mapping[name],
        )
      }
    }
  }
}

function normalizeXmlBooleans(root: Element) {
  const fields = Array.from(
    root.querySelectorAll('field'),
  )

  for (const field of fields) {
    const value = field.textContent
      ?.trim()
      .toUpperCase()

    if (value === 'TRUE') {
      field.textContent = 'TRUE'
    } else if (value === 'FALSE') {
      field.textContent = 'FALSE'
    }
  }
}

function normalizeLegacyInputNames(root: Element) {
  const blocks = Array.from(
    root.querySelectorAll('block,shadow'),
  )

  for (const block of blocks) {
    const type = block.getAttribute('type')

    if (
      type !== 'trade_definition_tradeoptions' &&
      type !== 'trade_definition'
    ) {
      continue
    }

    for (const input of Array.from(
      block.querySelectorAll(':scope > value, :scope > statement'),
    )) {
      const name = input.getAttribute('name')

      if (!name) continue

      if (
        name === 'STAKE' ||
        name === 'STAKE_AMOUNT'
      ) {
        input.setAttribute('name', 'AMOUNT')
      }

      if (
        name === 'DURATION_VALUE'
      ) {
        input.setAttribute('name', 'DURATION')
      }
    }
  }
}

function ensureMathNumberShadow(
  block: Element,
  inputName: string,
  defaultValue: string,
) {
  const value = Array.from(block.children).find(
    (child) =>
      child.tagName === 'value' &&
      child.getAttribute('name') === inputName,
  )

  if (!value) return

  const hasBlock = Array.from(
    value.children,
  ).some(
    (child) =>
      child.tagName === 'block' ||
      child.tagName === 'shadow',
  )

  if (hasBlock) return

  const doc = block.ownerDocument

  if (!doc) return

  const shadow = doc.createElement('shadow')
  shadow.setAttribute(
    'type',
    'math_number',
  )

  const field = doc.createElement('field')
  field.setAttribute('name', 'NUM')
  field.textContent = defaultValue

  shadow.appendChild(field)
  value.appendChild(shadow)
}

function repairTradeOptions(root: Element) {
  const optionsBlocks = Array.from(
    root.querySelectorAll(
      'block[type="trade_definition_tradeoptions"]',
    ),
  )

  for (const block of optionsBlocks) {
    ensureMathNumberShadow(
      block,
      'DURATION',
      '1',
    )

    ensureMathNumberShadow(
      block,
      'AMOUNT',
      '1',
    )
  }
}

function migrateLegacyTrade(root: Element) {
  const legacyTrades = Array.from(
    root.querySelectorAll(
      'block[type="trade_definition"]',
    ),
  )

  for (const trade of legacyTrades) {
    const existingOptions =
      trade.querySelector(
        ':scope > statement[name="TRADE_OPTIONS"]',
      )

    if (existingOptions) continue

    const fields = new Map<string, string>()

    for (const child of Array.from(
      trade.children,
    )) {
      if (child.tagName !== 'field') continue

      const name = child.getAttribute('name')

      if (!name) continue

      fields.set(
        name,
        child.textContent || '',
      )
    }

    if (!fields.size) continue

    const doc = trade.ownerDocument

    if (!doc) continue

    const statement = doc.createElement(
      'statement',
    )

    statement.setAttribute(
      'name',
      'TRADE_OPTIONS',
    )

    const addField = (
      parent: Element,
      name: string,
      value: string,
    ) => {
      const field = doc.createElement('field')
      field.setAttribute('name', name)
      field.textContent = value
      parent.appendChild(field)
    }

    const market =
      doc.createElement('block')

    market.setAttribute(
      'type',
      'trade_definition_market',
    )

    addField(
      market,
      'MARKET_LIST',
      fields.get('MARKET_LIST') ||
        fields.get('MARKET') ||
        'synthetic_index',
    )

    addField(
      market,
      'SUBMARKET_LIST',
      fields.get('SUBMARKET_LIST') ||
        fields.get('SUBMARKET') ||
        '',
    )

    addField(
      market,
      'SYMBOL_LIST',
      fields.get('SYMBOL_LIST') ||
        fields.get('SYMBOL') ||
        '',
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
      fields.get('TRADETYPECAT_LIST') ||
        fields.get('TRADETYPECAT') ||
        '',
    )

    addField(
      tradeType,
      'TRADETYPE_LIST',
      fields.get('TRADETYPE_LIST') ||
        fields.get('TRADETYPE') ||
        '',
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
      fields.get('TYPE_LIST') ||
        fields.get('CONTRACT_TYPE') ||
        fields.get('CONTRACTTYPE') ||
        '',
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
      fields.get('CANDLEINTERVAL_LIST') ||
        '60',
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
      fields.get(
        'TIME_MACHINE_ENABLED',
      ) || 'FALSE',
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
      fields.get(
        'RESTARTONERROR',
      ) || 'TRUE',
    )

    const next1 = doc.createElement('next')
    next1.appendChild(tradeType)
    market.appendChild(next1)

    const next2 = doc.createElement('next')
    next2.appendChild(contract)
    tradeType.appendChild(next2)

    const next3 = doc.createElement('next')
    next3.appendChild(candle)
    contract.appendChild(next3)

    const next4 = doc.createElement('next')
    next4.appendChild(restartBuy)
    candle.appendChild(next4)

    const next5 = doc.createElement('next')
    next5.appendChild(restartError)
    restartBuy.appendChild(next5)

    statement.appendChild(market)

    for (const child of Array.from(
      trade.children,
    )) {
      if (child.tagName === 'field') {
        trade.removeChild(child)
      }
    }

    trade.insertBefore(
      statement,
      trade.firstChild,
    )
  }
}

function migrateXml(root: Element) {
  renameBlocks(root)
  renameFields(root)
  normalizeXmlBooleans(root)
  normalizeLegacyInputNames(root)
  migrateLegacyTrade(root)
  repairTradeOptions(root)

  return root
}
function withXmlDropdownPreservation(
  callback: () => void,
) {
  const FieldDropdownClass =
    Blockly.FieldDropdown as unknown as {
      prototype: {
        doClassValidation_?: (
          newValue: string,
        ) => string | null
      }
    }

  const prototype =
    FieldDropdownClass.prototype

  const originalValidation =
    prototype.doClassValidation_

  if (
    typeof originalValidation !== 'function'
  ) {
    callback()
    return
  }

  /*
   * Blockly validates FieldDropdown values while
   * domToWorkspace() is constructing the blocks.
   *
   * Deriv's market/submarket/symbol dropdowns are
   * dynamic, so their options may not exist yet when
   * an XML bot is imported.
   *
   * During XML deserialization only, preserve the
   * value contained in the XML instead of allowing
   * FieldDropdown to reject it because its dynamic
   * options have not loaded yet.
   */
  prototype.doClassValidation_ =
    function preserveImportedXmlValue(
      newValue: string,
    ) {
      if (
        newValue === null ||
        newValue === undefined
      ) {
        return ''
      }

      return String(newValue)
    }

  try {
    callback()
  } finally {
    /*
     * IMPORTANT:
     * Restore Blockly's original validation
     * immediately after XML import.
     */
    prototype.doClassValidation_ =
      originalValidation
  }
}

/* =========================================================
   LOAD XML
========================================================= */

export function loadFromXml(
  workspace: Blockly.WorkspaceSvg,
  xmlText: string,
) {
  try {
    if (
      !xmlText ||
      !xmlText.trim()
    ) {
      throw new Error(
        'Empty XML file.',
      )
    }

    const dom =
      Blockly.utils.xml.textToDom(
        xmlText,
      )

    migrateXml(dom)

    workspace.clear()

    /*
     * Dynamic Deriv dropdowns can reject valid XML
     * values during Blockly's deserialization because
     * their option lists may not have been populated yet.
     *
     * Keep validation relaxed only for this synchronous
     * XML import operation. The original Blockly
     * validation is restored immediately afterwards.
     */
    withXmlDropdownPreservation(() => {
      Blockly.Xml.domToWorkspace(
        dom,
        workspace,
      )
    })

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

export function isValidBotXml(
  xml: string,
) {
  try {
    if (!xml.trim()) return false

    Blockly.utils.xml.textToDom(xml)

    return true
  } catch {
    return false
  }
}

/* =========================================================
   TRADE PARAMS
========================================================= */

export interface TradeParams {
  symbol: string
  contract_type: string
  trade_type: string
  duration: number
  duration_unit: string
  amount: number
  currency: string
  prediction?: number
  barrier?: string
  second_barrier?: string
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

function finiteNumber(
  value: unknown,
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : undefined
}

function readNumericBlock(
  block: Blockly.Block | null,
): number | undefined {
  if (!block) return undefined

  const direct = finiteNumber(
    block.getFieldValue('NUM'),
  )

  if (direct !== undefined) {
    return direct
  }

  const value = block.getFieldValue('VALUE')

  const valueNumber = finiteNumber(value)

  if (valueNumber !== undefined) {
    return valueNumber
  }

  return undefined
}

function numberValue(
  block: Blockly.Block,
  inputNames: string | string[],
) {
  const names = Array.isArray(
    inputNames,
  )
    ? inputNames
    : [inputNames]

  for (const name of names) {
    const target =
      block.getInputTargetBlock(name)

    const value =
      readNumericBlock(target)

    if (value !== undefined) {
      return value
    }

    const fieldValue =
      finiteNumber(
        block.getFieldValue(name),
      )

    if (fieldValue !== undefined) {
      return fieldValue
    }
  }

  return undefined
}

function textValue(
  block: Blockly.Block,
  names: string[],
) {
  for (const name of names) {
    const value =
      block.getFieldValue(name)

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      return String(value)
    }
  }

  return ''
}

function getTradeChain(
  root: Blockly.Block,
) {
  const blocks: Blockly.Block[] = []

  let block =
    root.getInputTargetBlock(
      'TRADE_OPTIONS',
    )

  while (block) {
    blocks.push(block)
    block = block.getNextBlock()
  }

  return blocks
}

function findBlockByType(
  blocks: Blockly.Block[],
  type: string,
) {
  return blocks.find(
    (block) => block.type === type,
  )
}

function getOptionBlock(
  root: Blockly.Block,
) {
  const direct =
    root.getInputTargetBlock(
      'SUBMARKET',
    )

  if (
    direct?.type ===
    'trade_definition_tradeoptions'
  ) {
    return direct
  }

  const candidates =
    root.getDescendants(true)

  return (
    candidates.find(
      (block) =>
        block.type ===
        'trade_definition_tradeoptions',
    ) || null
  )
}



function getOptionalText(
  block: Blockly.Block,
  names: string[],
) {
  return textValue(block, names)
}

export function extractTradeParams(
  workspace: Blockly.WorkspaceSvg,
): TradeParamsResult {
  const root =
    workspace
      .getTopBlocks(false)
      .find(
        (block) =>
          block.type ===
          'trade_definition',
      )

  if (!root) {
    return {
      ok: false,
      missingField:
        'trade_definition',
    }
  }

  const chain =
    getTradeChain(root)

  const market =
    findBlockByType(
      chain,
      'trade_definition_market',
    )

  const tradeTypeBlock =
    findBlockByType(
      chain,
      'trade_definition_tradetype',
    )

  const contractBlock =
    findBlockByType(
      chain,
      'trade_definition_contracttype',
    )

  let symbol =
    market
      ? textValue(market, [
          'SYMBOL_LIST',
          'SYMBOL',
        ])
      : ''

  let tradeType =
    tradeTypeBlock
      ? textValue(tradeTypeBlock, [
          'TRADETYPE_LIST',
          'TRADE_TYPE',
        ])
      : ''

  let contractType =
    contractBlock
      ? textValue(contractBlock, [
          'TYPE_LIST',
          'CONTRACT_TYPE',
        ])
      : ''

  /*
   * Legacy XML sometimes stores these fields directly
   * on the root trade_definition block.
   */
  if (!symbol) {
    symbol = textValue(root, [
      'SYMBOL_LIST',
      'SYMBOL',
    ])
  }

  if (!tradeType) {
    tradeType = textValue(root, [
      'TRADETYPE_LIST',
      'TRADETYPE',
    ])
  }

  if (!contractType) {
    contractType = textValue(root, [
      'TYPE_LIST',
      'CONTRACT_TYPE',
      'CONTRACTTYPE',
    ])
  }

  if (!symbol) {
    return {
      ok: false,
      missingField: 'symbol',
    }
  }

  if (!contractType) {
    return {
      ok: false,
      missingField:
        'contract_type',
    }
  }

  const options =
    getOptionBlock(root)

  if (!options) {
    return {
      ok: false,
      missingField:
        'trade_options',
    }
  }

  const repairedInputs: string[] = []

  let duration =
    numberValue(
      options,
      VALUE_FIELD_ALIASES.DURATION,
    )

  let amount =
    numberValue(
      options,
      VALUE_FIELD_ALIASES.AMOUNT,
    )

  const prediction =
    numberValue(
      options,
      VALUE_FIELD_ALIASES.PREDICTION,
    )

  if (
    duration === undefined
  ) {
    duration = 1
    repairedInputs.push(
      'duration',
    )
  }

  if (
    amount === undefined
  ) {
    return {
      ok: false,
      missingField: 'amount',
    }
  }

  let durationUnit =
    textValue(options, [
      'DURATIONTYPE_LIST',
      'DURATION_UNIT',
      'DURATIONUNIT',
    ])

  let currency =
    textValue(options, [
      'CURRENCY_LIST',
      'CURRENCY',
    ])

  /*
   * Safe defaults for legacy XML.
   * Currency is still validated at runtime against
   * the authenticated account where possible.
   */
  if (!durationUnit) {
    durationUnit = 't'
    repairedInputs.push(
      'duration_unit',
    )
  }

  if (!currency) {
    currency = 'USD'
    repairedInputs.push(
      'currency',
    )
  }

  const barrier =
    getOptionalText(
      options,
      VALUE_FIELD_ALIASES.BARRIER,
    )

  const secondBarrier =
    getOptionalText(
      options,
      VALUE_FIELD_ALIASES.SECOND_BARRIER,
    )

  const digitContracts = [
    'DIGITMATCH',
    'DIGITDIFF',
    'DIGITOVER',
    'DIGITUNDER',
  ]

  if (
    digitContracts.includes(
      contractType,
    ) &&
    prediction === undefined &&
    !barrier
  ) {
    return {
      ok: false,
      missingField:
        'prediction',
    }
  }

  const normalizedPrediction =
    prediction !== undefined
      ? prediction
      : finiteNumber(barrier)

  return {
    ok: true,

    params: {
      symbol,
      contract_type:
        contractType,
      trade_type:
        tradeType,
      duration,
      duration_unit:
        durationUnit,
      amount,
      currency,
      prediction:
        normalizedPrediction,
      barrier:
        barrier ||
        (
          normalizedPrediction !==
          undefined
            ? String(
                normalizedPrediction,
              )
            : undefined
        ),
      second_barrier:
        secondBarrier ||
        undefined,
    },

    repairedInputs,
  }
}

/* =========================================================
   SAFE IMPORT
========================================================= */

export async function loadBotXmlSafely(
  workspace: Blockly.WorkspaceSvg,
  xml: string,
  fetchSymbolsIfNeeded: () => Promise<
    RawSymbol[] | null
  >,
  currentlyLoadedSymbols:
    | RawSymbol[]
    | null,
): Promise<
  | {
      ok: true
      repaired: boolean
    }
  | {
      ok: false
      reason: string
    }
> {
  try {
    let symbols =
      currentlyLoadedSymbols

    if (!symbols?.length) {
      symbols =
        await fetchSymbolsIfNeeded()
    }

    if (symbols?.length) {
      setGlobalMarketOptions(
        symbols,
      )
    }

    const valid =
      isValidBotXml(xml)

    if (!valid) {
      return {
        ok: false,
        reason:
          'The uploaded file is not valid Blockly XML.',
      }
    }

    const ok =
      loadFromXml(
        workspace,
        xml,
      )

    if (!ok) {
      return {
        ok: false,
        reason:
          'Unable to load this Deriv bot XML. The file may contain unsupported blocks.',
      }
    }

    const params =
      extractTradeParams(
        workspace,
      )

    return {
      ok: true,
      repaired:
        params.ok &&
        params.repairedInputs.length >
          0,
    }
  } catch (error) {
    console.error(
      '[Bot XML Import]',
      error,
    )

    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : 'Unknown XML import error.',
    }
  }
}

export {
  createBotApi
} from './botApi'

export type {
  BotApi,
  NotificationType,
  NotifyData,
} from './botApi'
export {
  generateBotCode
} from './generators'
  
export {
  setGlobalMarketOptions
}