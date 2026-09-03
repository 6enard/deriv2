import * as Blockly from 'blockly'
import 'blockly/blocks'

import {
  Colours,
  darkThemeOverrides,
} from './colours'

import {
  setGlobalMarketOptions,
  type RawSymbol,
  getFirstMarketValue,
  getFirstSubmarketValue,
  getFirstSymbolValue,
  getFirstTradeTypeCategoryValue,
  getFirstTradeTypeValue,
  getFirstContractTypeValue,
  getFirstPurchaseValue,
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
  if (themeRegistered) {
    return
  }

  Blockly.Theme.defineTheme('dbot_dark', {
    name: 'dbot_dark',
    base: Blockly.Themes.Zelos,

    categoryStyles: {
      trade_parameters: {
        colour: Colours.RootBlock.colour,
      },
      purchase_conditions: {
        colour: Colours.RootBlock.colour,
      },
      sell_conditions: {
        colour: Colours.RootBlock.colour,
      },
      trade_results: {
        colour: Colours.RootBlock.colour,
      },
      analysis: {
        colour: Colours.Base.colour,
      },
      utility: {
        colour: Colours.Base.colour,
      },
      technical_analysis: {
        colour: Colours.Base.colour,
      },
      indicators: {
        colour: Colours.Base.colour,
      },
      time: {
        colour: Colours.Base.colour,
      },
      candle: {
        colour: Colours.Base.colour,
      },
      miscellaneous: {
        colour: Colours.Base.colour,
      },
      math: {
        colour: '#3b5266',
      },
      logic: {
        colour: '#3b5266',
      },
      text: {
        colour: '#3b6b3b',
      },
      lists: {
        colour: '#4a3b66',
      },
      loops: {
        colour: '#3b6b3b',
      },
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
    typeof window !== 'undefined' && window.innerWidth < 1024

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

  const dom = Blockly.utils.xml.textToDom(defaultWorkspaceXml)
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
  candle_interval: 'trade_definition_candleinterval',
  restartbuysell: 'trade_definition_restartbuysell',
  restart_buy_sell: 'trade_definition_restartbuysell',
  restartonerror: 'trade_definition_restartonerror',
  restart_on_error: 'trade_definition_restartonerror',
  trade_definition_restart: 'trade_definition_restartonerror',
  check_result: 'contract_check_result',
  contract_check_result: 'contract_check_result',
  result_check: 'contract_check_result',
  tickdelay: 'tick_delay',
  tick_delay: 'tick_delay',
  math_number_positive: 'math_number',
  buy: 'purchase',
  purchase_conditions: 'before_purchase',
  before_purchase_conditions: 'before_purchase',
  during_purchase_conditions: 'during_purchase',
  after_purchase_conditions: 'after_purchase',
  sell_conditions: 'during_purchase',
  trade_results: 'after_purchase',
  trade_definition_purchase: 'before_purchase',
  trade_definition_during_purchase: 'during_purchase',
  trade_definition_after_purchase: 'after_purchase',
  submarket: 'trade_definition_tradeoptions',
  trade_definition_trade_options: 'trade_definition_tradeoptions',
}

const FIELD_RENAMES: Record<string, Record<string, string>> = {
  read_details: {
    DETAILS: 'DETAIL_INDEX',
    DETAIL: 'DETAIL_INDEX',
  },
  tick_delay: {
    TICKS: 'TICKDELAYVALUE',
    TIMEOUTSTACK: 'TICKDELAYSTACK',
    DELAYSTACK: 'TICKDELAYSTACK',
  },
  console: {
    VALUE: 'MESSAGE',
    TEXT: 'MESSAGE',
  },
  notify: {
    VALUE: 'MESSAGE',
    TEXT: 'MESSAGE',
    MSG: 'MESSAGE',
  },
  contract_check_result: {
    RESULT: 'CHECK_RESULT',
    CHECKRESULT: 'CHECK_RESULT',
    RESULTS: 'CHECK_RESULT',
  },
  trade_definition_market: {
    MARKET: 'MARKET_LIST',
    SUBMARKET: 'SUBMARKET_LIST',
    SYMBOL: 'SYMBOL_LIST',
    UNDERLYING_SYMBOL: 'SYMBOL_LIST',
  },
  trade_definition_tradetype: {
    TRADETYPECAT: 'TRADETYPECAT_LIST',
    TRADE_TYPE_CAT: 'TRADETYPECAT_LIST',
    TRADETYPE: 'TRADETYPE_LIST',
    TRADE_TYPE: 'TRADETYPE_LIST',
  },
  trade_definition_contracttype: {
    TYPE: 'TYPE_LIST',
    CONTRACT_TYPE: 'TYPE_LIST',
  },
  trade_definition_candleinterval: {
    CANDLEINTERVAL: 'CANDLEINTERVAL_LIST',
    CANDLE_INTERVAL: 'CANDLEINTERVAL_LIST',
    INTERVAL: 'CANDLEINTERVAL_LIST',
  },
  trade_definition_tradeoptions: {
    DURATIONTYPE: 'DURATIONTYPE_LIST',
    DURATION_TYPE: 'DURATIONTYPE_LIST',
    CURRENCY: 'CURRENCY_LIST',
  },
  purchase: {
    PURCHASE: 'PURCHASE_LIST',
    CONTRACT_TYPE: 'PURCHASE_LIST',
    TYPE: 'PURCHASE_LIST',
  },
  trade_definition_restartbuysell: {
    TIME_MACHINE: 'TIME_MACHINE_ENABLED',
    RESTARTBUYSELL: 'TIME_MACHINE_ENABLED',
  },
}

function renameBlocks(root: Element) {
  const blocks = Array.from(root.querySelectorAll('block,shadow'))

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
  const blocks = Array.from(root.querySelectorAll('block,shadow'))

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
        child.setAttribute('name', mapping[name])
      }
    }
  }
}

function normalizeXmlBooleans(root: Element) {
  const fields = Array.from(root.querySelectorAll('field'))

  for (const field of fields) {
    const value = field.textContent?.trim().toUpperCase()

    if (value === 'TRUE') {
      field.textContent = 'TRUE'
    } else if (value === 'FALSE') {
      field.textContent = 'FALSE'
    }
  }
}

/* =========================================================
VARIABLE MIGRATION
========================================================= */

function migrateLegacyVariables(root: Element) {
  const doc = root.ownerDocument
  if (!doc) return

  let variablesElement = Array.from(root.children).find(
    (child) => child.tagName === 'variables',
  )

  if (!variablesElement) {
    variablesElement = doc.createElement('variables')
    root.insertBefore(variablesElement, root.firstChild)
  }

  const variablesById = new Map<string, string>()
  const variablesByName = new Map<string, string>()

  for (const child of Array.from(variablesElement.children)) {
    if (child.tagName !== 'variable') continue

    const id = child.getAttribute('id')
    const name = child.textContent?.trim() || ''

    if (!id || !name) continue

    variablesById.set(id, name)
    if (!variablesByName.has(name)) {
      variablesByName.set(name, id)
    }
  }

  const createVariableId = () => {
    let id = ''
    do {
      id = Blockly.utils.idGenerator.genUid()
    } while (variablesById.has(id))
    return id
  }

  const varFields = Array.from(root.querySelectorAll('field[name="VAR"]'))

  for (const field of varFields) {
    const rawValue = field.textContent?.trim() || ''
    if (!rawValue) continue

    if (variablesById.has(rawValue)) continue

    let variableId = variablesByName.get(rawValue)

    if (!variableId) {
      variableId = createVariableId()

      const variable = doc.createElement('variable')
      variable.setAttribute('id', variableId)
      variable.textContent = rawValue

      variablesElement.appendChild(variable)
      variablesById.set(variableId, rawValue)
      variablesByName.set(rawValue, variableId)
    }

    field.textContent = variableId
  }

  const legacyVariableFields = Array.from(
    root.querySelectorAll('field[name="VARIABLE"]'),
  )

  for (const field of legacyVariableFields) {
    const rawValue = field.textContent?.trim() || ''
    const variableId = field.getAttribute('id')

    if (variableId && variablesById.has(variableId)) continue
    if (!rawValue) continue

    let id = variableId || variablesByName.get(rawValue)

    if (!id) {
      id = createVariableId()

      const variable = doc.createElement('variable')
      variable.setAttribute('id', id)
      variable.textContent = rawValue

      variablesElement.appendChild(variable)
      variablesById.set(id, rawValue)
      variablesByName.set(rawValue, id)
    }

    field.setAttribute('id', id)
  }
}

/* =========================================================
LEGACY TEXT JOIN
========================================================= */

function repairLegacyTextJoin(root: Element) {
  const blocks = Array.from(
    root.querySelectorAll('block[type="text_join"],shadow[type="text_join"]'),
  )

  for (const block of blocks) {
    const hasStack = Array.from(block.children).some(
      (child) =>
        child.tagName === 'statement' &&
        child.getAttribute('name') === 'STACK',
    )

    const hasVariable = Array.from(block.children).some(
      (child) =>
        child.tagName === 'field' &&
        child.getAttribute('name') === 'VARIABLE',
    )

    if (hasStack || hasVariable) {
      block.setAttribute('type', 'text_join_legacy')
    }
  }
}

/* =========================================================
TRADE OPTION REPAIR
========================================================= */

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

  const hasBlock = Array.from(value.children).some(
    (child) => child.tagName === 'block' || child.tagName === 'shadow',
  )

  if (hasBlock) return

  const doc = block.ownerDocument
  if (!doc) return

  const shadow = doc.createElement('shadow')
  shadow.setAttribute('type', 'math_number')

  const field = doc.createElement('field')
  field.setAttribute('name', 'NUM')
  field.textContent = defaultValue

  shadow.appendChild(field)
  value.appendChild(shadow)
}

function repairTradeOptions(root: Element) {
  const blocks = Array.from(
    root.querySelectorAll('block[type="trade_definition_tradeoptions"]'),
  )

  for (const block of blocks) {
    ensureMathNumberShadow(block, 'DURATION', '1')
    ensureMathNumberShadow(block, 'AMOUNT', '1')
  }
}

/* =========================================================
ENSURE TRADE PARAMETER BLOCKS
Injects missing candle interval, restart buy/sell, and
restart on error blocks into legacy bot XML that predates
them. Also ensures missing field elements are created on
existing blocks so dropdown repair can fill them.
========================================================= */

function ensureFieldElement(
  block: Element,
  name: string,
  value: string,
): void {
  if (findDirectField(block, name)) return

  const doc = block.ownerDocument
  if (!doc) return

  const field = doc.createElement('field')
  field.setAttribute('name', name)
  field.textContent = value
  block.appendChild(field)
}

function ensureTradeParameterBlocks(root: Element) {
  const marketBlock = root.querySelector(
    'block[type="trade_definition_market"]',
  )
  if (!marketBlock) return

  // Ensure market block has all three field elements
  ensureFieldElement(marketBlock, 'MARKET_LIST', '')
  ensureFieldElement(marketBlock, 'SUBMARKET_LIST', '')
  ensureFieldElement(marketBlock, 'SYMBOL_LIST', '')

  // Walk the chain of blocks inside TRADE_OPTIONS to find
  // the last block, then append any missing trade parameter blocks.
  const tradeDefinition = root.querySelector(
    'block[type="trade_definition"]',
  )

  if (!tradeDefinition) return

  const tradeOptionsStatement = Array.from(
    tradeDefinition.children,
  ).find(
    (child) =>
      child.tagName === 'statement' &&
      child.getAttribute('name') === 'TRADE_OPTIONS',
  )

  if (!tradeOptionsStatement) return

  // Find all existing trade parameter block types in the chain
  const existingTypes = new Set<string>()
  let cursor: Element | null = marketBlock
  let lastInChain: Element = marketBlock

  while (cursor) {
    const type = cursor.getAttribute('type')
    if (type) existingTypes.add(type)
    lastInChain = cursor

    const nextContainer: Element | undefined = Array.from(cursor.children).find(
      (child) => child.tagName === 'next',
    )

    const childBlock: Element | null = nextContainer
      ? (nextContainer.querySelector(':scope > block') as Element | null)
      : null
    cursor = childBlock
  }

  const doc = root.ownerDocument
  if (!doc) return

  // The standard order: market -> tradetype -> contracttype ->
  // candleinterval -> restartbuysell -> restartonerror
  const missingBlocks: Array<{
    type: string
    field: string
    value: string
  }> = []

  if (!existingTypes.has('trade_definition_candleinterval')) {
    missingBlocks.push({
      type: 'trade_definition_candleinterval',
      field: 'CANDLEINTERVAL_LIST',
      value: '60',
    })
  }

  if (!existingTypes.has('trade_definition_restartbuysell')) {
    missingBlocks.push({
      type: 'trade_definition_restartbuysell',
      field: 'TIME_MACHINE_ENABLED',
      value: 'false',
    })
  }

  if (!existingTypes.has('trade_definition_restartonerror')) {
    missingBlocks.push({
      type: 'trade_definition_restartonerror',
      field: 'RESTARTONERROR',
      value: 'true',
    })
  }

  if (missingBlocks.length === 0) return

  let appendTarget = lastInChain

  for (const missing of missingBlocks) {
    // Check if appendTarget already has a <next> — if so, follow it
    // (shouldn't happen since we walked the chain, but be safe)
    const existingNext = Array.from(appendTarget.children).find(
      (child) => child.tagName === 'next',
    )

    if (existingNext) {
      const innerBlock = existingNext.querySelector(':scope > block')
      if (innerBlock) {
        appendTarget = innerBlock as Element
        continue
      }
    }

    // Create <next> wrapping the new block
    const nextEl = doc.createElement('next')
    const newBlock = doc.createElement('block')
    newBlock.setAttribute('type', missing.type)

    const field = doc.createElement('field')
    field.setAttribute('name', missing.field)
    field.textContent = missing.value
    newBlock.appendChild(field)

    nextEl.appendChild(newBlock)
    appendTarget.appendChild(nextEl)
    appendTarget = newBlock
  }
}

/* =========================================================
ENSURE ROOT BLOCKS
Ensures the four mandatory root blocks exist in the XML.
Some very old or minimal bot files may only contain a
trade_definition block without before_purchase,
during_purchase, or after_purchase.
========================================================= */

function ensureRootBlocks(root: Element) {
  const doc = root.ownerDocument
  if (!doc) return

  const hasBefore = root.querySelector('block[type="before_purchase"]')
  const hasDuring = root.querySelector('block[type="during_purchase"]')
  const hasAfter = root.querySelector('block[type="after_purchase"]')
  const hasTradeDef = root.querySelector('block[type="trade_definition"]')

  if (!hasTradeDef) return // Can't fix if there's no trade definition at all

  if (!hasBefore) {
    const before = doc.createElement('block')
    before.setAttribute('type', 'before_purchase')
    before.setAttribute('x', '0')
    before.setAttribute('y', '576')

    const stmt = doc.createElement('statement')
    stmt.setAttribute('name', 'BEFOREPURCHASE_STACK')

    const purchase = doc.createElement('block')
    purchase.setAttribute('type', 'purchase')

    const field = doc.createElement('field')
    field.setAttribute('name', 'PURCHASE_LIST')
    field.textContent = ''
    purchase.appendChild(field)

    stmt.appendChild(purchase)
    before.appendChild(stmt)
    root.appendChild(before)
  }

  if (!hasDuring) {
    const during = doc.createElement('block')
    during.setAttribute('type', 'during_purchase')
    during.setAttribute('x', '720')
    during.setAttribute('y', '0')

    const stmt = doc.createElement('statement')
    stmt.setAttribute('name', 'DURING_PURCHASE_STACK')

    const ctrlIf = doc.createElement('block')
    ctrlIf.setAttribute('type', 'controls_if')

    const ifValue = doc.createElement('value')
    ifValue.setAttribute('name', 'IF0')

    const checkSell = doc.createElement('block')
    checkSell.setAttribute('type', 'check_sell')
    ifValue.appendChild(checkSell)
    ctrlIf.appendChild(ifValue)
    stmt.appendChild(ctrlIf)
    during.appendChild(stmt)
    root.appendChild(during)
  }

  if (!hasAfter) {
    const after = doc.createElement('block')
    after.setAttribute('type', 'after_purchase')
    after.setAttribute('x', '720')
    after.setAttribute('y', '248')

    const stmt = doc.createElement('statement')
    stmt.setAttribute('name', 'AFTERPURCHASE_STACK')

    const tradeAgain = doc.createElement('block')
    tradeAgain.setAttribute('type', 'trade_again')
    stmt.appendChild(tradeAgain)
    after.appendChild(stmt)
    root.appendChild(after)
  }
}

/* =========================================================
DROPDOWN XML REPAIR
========================================================= */

function findDirectField(block: Element, name: string): Element | null {
  return (
    Array.from(block.children).find(
      (child) =>
        child.tagName === 'field' &&
        child.getAttribute('name') === name,
    ) || null
  )
}

function repairMarketFields(root: Element) {
  const marketBlock = root.querySelector(
    'block[type="trade_definition_market"]',
  )

  if (!marketBlock) return

  // Ensure field elements exist even if the legacy XML omitted them
  ensureFieldElement(marketBlock, 'MARKET_LIST', '')
  ensureFieldElement(marketBlock, 'SUBMARKET_LIST', '')
  ensureFieldElement(marketBlock, 'SYMBOL_LIST', '')

  const marketField = findDirectField(marketBlock, 'MARKET_LIST')
  const submarketField = findDirectField(marketBlock, 'SUBMARKET_LIST')
  const symbolField = findDirectField(marketBlock, 'SYMBOL_LIST')

  let market = marketField?.textContent?.trim() || ''

  if (!market) {
    market = getFirstMarketValue()
    if (marketField && market) {
      marketField.textContent = market
    }
  }

  let submarket = submarketField?.textContent?.trim() || ''

  if (!submarket && market) {
    submarket = getFirstSubmarketValue(market)
    if (submarketField && submarket) {
      submarketField.textContent = submarket
    }
  }

  let symbol = symbolField?.textContent?.trim() || ''

  if (!symbol && submarket) {
    symbol = getFirstSymbolValue(submarket)
    if (symbolField && symbol) {
      symbolField.textContent = symbol
    }
  }
}

function repairTradeDefinitionFields(root: Element) {
  const tradeTypes = Array.from(
    root.querySelectorAll('block[type="trade_definition_tradetype"]'),
  )

  for (const block of tradeTypes) {
    ensureFieldElement(block, 'TRADETYPECAT_LIST', '')
    ensureFieldElement(block, 'TRADETYPE_LIST', '')

    const category = findDirectField(block, 'TRADETYPECAT_LIST')
    const type = findDirectField(block, 'TRADETYPE_LIST')

    if (category && !category.textContent?.trim()) {
      category.textContent = getFirstTradeTypeCategoryValue()
    }

    const categoryValue =
      category?.textContent?.trim() || getFirstTradeTypeCategoryValue()

    if (type && !type.textContent?.trim()) {
      type.textContent = getFirstTradeTypeValue(categoryValue)
    }
  }

  const contracts = Array.from(
    root.querySelectorAll('block[type="trade_definition_contracttype"]'),
  )

  for (const block of contracts) {
    ensureFieldElement(block, 'TYPE_LIST', '')

    const field = findDirectField(block, 'TYPE_LIST')

    if (field && !field.textContent?.trim()) {
      const tradeTypeBlock = root.querySelector(
        'block[type="trade_definition_tradetype"]',
      )

      const tradeType = tradeTypeBlock
        ? String(
            findDirectField(
              tradeTypeBlock,
              'TRADETYPE_LIST',
            )?.textContent?.trim() || '',
          )
        : ''

      field.textContent = getFirstContractTypeValue(tradeType) || 'both'
    }
  }
}

function repairPurchaseField(root: Element) {
  const purchases = Array.from(root.querySelectorAll('block[type="purchase"]'))

  const tradeTypeBlock = root.querySelector(
    'block[type="trade_definition_tradetype"]',
  )

  const tradeType = tradeTypeBlock
    ? String(
        findDirectField(
          tradeTypeBlock,
          'TRADETYPE_LIST',
        )?.textContent?.trim() || '',
      )
    : ''

  const contractBlock = root.querySelector(
    'block[type="trade_definition_contracttype"]',
  )

  const contractType = contractBlock
    ? String(
        findDirectField(
          contractBlock,
          'TYPE_LIST',
        )?.textContent?.trim() || '',
      )
    : ''

  let defaultPurchase = ''

  if (contractType && contractType !== 'both') {
    defaultPurchase = contractType
  } else {
    defaultPurchase = getFirstPurchaseValue(tradeType)
  }

  for (const purchase of purchases) {
    ensureFieldElement(purchase, 'PURCHASE_LIST', '')

    const field = findDirectField(purchase, 'PURCHASE_LIST')
    if (!field || field.textContent?.trim()) continue

    if (defaultPurchase) {
      field.textContent = defaultPurchase
    }
  }
}

function migrateXml(root: Element) {
  renameBlocks(root)
  renameFields(root)
  normalizeXmlBooleans(root)
  migrateLegacyVariables(root)
  repairLegacyTextJoin(root)
  ensureRootBlocks(root)
  ensureTradeParameterBlocks(root)
  repairMarketFields(root)
  repairTradeDefinitionFields(root)
  repairPurchaseField(root)
  repairTradeOptions(root)

  return root
}

/* =========================================================
IMPORTED FIELD RESTORATION
========================================================= */

function restoreDynamicField(
  block: Blockly.Block,
  xmlBlock: Element,
  name: string,
) {
  const xmlField = Array.from(xmlBlock.children).find(
    (child) =>
      child.tagName === 'field' && child.getAttribute('name') === name,
  )

  if (!xmlField) return

  const value = xmlField.textContent?.trim() || ''
  if (!value) return

  const field = block.getField(name)
  if (!field) return

  try {
    field.setValue(value)
  } catch (error) {
    console.warn('[Bot XML] Could not restore dynamic field', {
      block: block.type,
      name,
      value,
      error,
    })
  }
}

function restoreImportedTradeFields(
  workspace: Blockly.WorkspaceSvg,
  root: Element,
) {
  const xmlBlocks = Array.from(root.querySelectorAll('block'))

  for (const xmlBlock of xmlBlocks) {
    const id = xmlBlock.getAttribute('id')
    if (!id) continue

    const workspaceBlock = workspace.getBlockById(id)
    if (!workspaceBlock) continue

    for (const child of Array.from(xmlBlock.children)) {
      if (child.tagName !== 'field') continue

      const name = child.getAttribute('name')
      if (!name) continue

      const value = child.textContent?.trim() || ''
      if (!value) continue

      const field = workspaceBlock.getField(name)
      if (!field) continue

      if (
        name === 'MARKET_LIST' ||
        name === 'SUBMARKET_LIST' ||
        name === 'SYMBOL_LIST' ||
        name === 'TRADETYPECAT_LIST' ||
        name === 'TRADETYPE_LIST' ||
        name === 'TYPE_LIST' ||
        name === 'PURCHASE_LIST' ||
        name === 'VAR' ||
        name === 'VARIABLE'
      ) {
        continue
      }

      try {
        field.setValue(value)
      } catch (error) {
        console.warn('[Bot XML] Unable to restore field', {
          type: workspaceBlock.type,
          name,
          value,
          error,
        })
      }
    }
  }

  for (const xmlBlock of xmlBlocks) {
    const id = xmlBlock.getAttribute('id')
    if (!id) continue

    const block = workspace.getBlockById(id)
    if (!block) continue

    if (block.type === 'trade_definition_market') {
      restoreDynamicField(block, xmlBlock, 'MARKET_LIST')
      restoreDynamicField(block, xmlBlock, 'SUBMARKET_LIST')
      restoreDynamicField(block, xmlBlock, 'SYMBOL_LIST')
    }
  }

  for (const xmlBlock of xmlBlocks) {
    const id = xmlBlock.getAttribute('id')
    if (!id) continue

    const block = workspace.getBlockById(id)
    if (!block || block.type !== 'trade_definition_tradetype') continue

    restoreDynamicField(block, xmlBlock, 'TRADETYPECAT_LIST')
    restoreDynamicField(block, xmlBlock, 'TRADETYPE_LIST')
  }

  for (const xmlBlock of xmlBlocks) {
    const id = xmlBlock.getAttribute('id')
    if (!id) continue

    const block = workspace.getBlockById(id)
    if (!block || block.type !== 'trade_definition_contracttype') continue

    restoreDynamicField(block, xmlBlock, 'TYPE_LIST')
  }

  for (const xmlBlock of xmlBlocks) {
    const id = xmlBlock.getAttribute('id')
    if (!id) continue

    const block = workspace.getBlockById(id)
    if (!block || block.type !== 'purchase') continue

    restoreDynamicField(block, xmlBlock, 'PURCHASE_LIST')
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
    if (!xmlText || !xmlText.trim()) {
      throw new Error('Empty XML file.')
    }

    const dom = Blockly.utils.xml.textToDom(xmlText)

    migrateXml(dom)
    workspace.clear()
    Blockly.Xml.domToWorkspace(dom, workspace)
    restoreImportedTradeFields(workspace, dom)
    Blockly.svgResize(workspace)

    return true
  } catch (error) {
    console.error('[Bot XML Loader]', error)
    return false
  }
}

export function isValidBotXml(xml: string) {
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
  candle_interval?: string | number
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

function finiteNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function readVariableName(block: Blockly.Block): string {
  const field = block.getField('VAR')
  if (!field) return ''

  const id = field.getValue()
  if (!id) return ''

  const variable = block.workspace.getVariableById(id)
  return variable?.name || ''
}

function readNumericBlock(
  block: Blockly.Block | null,
  seenVariables = new Set<string>(),
): number | undefined {
  if (!block) return undefined

  const direct = finiteNumber(block.getFieldValue('NUM'))
  if (direct !== undefined) return direct

  const value = finiteNumber(block.getFieldValue('VALUE'))
  if (value !== undefined) return value

  if (block.type === 'variables_get') {
    const field = block.getField('VAR')
    if (!field) return undefined

    const variableId = field.getValue()
    if (!variableId || seenVariables.has(variableId)) return undefined

    seenVariables.add(variableId)

    const variable = block.workspace.getVariableById(variableId)
    if (!variable) return undefined

    const variableName = variable.name

    const sets = block.workspace
      .getAllBlocks(false)
      .filter(
        (candidate) =>
          candidate.type === 'variables_set' &&
          readVariableName(candidate) === variableName,
      )

    for (const setBlock of sets) {
      const input = setBlock.getInputTargetBlock('VALUE')
      const resolved = readNumericBlock(
        input ?? null,
        new Set(seenVariables),
      )

      if (resolved !== undefined) return resolved
    }
  }

  for (const input of block.inputList) {
    if (input.type !== Blockly.inputs.inputTypes.VALUE) continue

    const target = input.connection?.targetBlock()
    const resolved = readNumericBlock(
      target ?? null,
      new Set(seenVariables),
    )

    if (resolved !== undefined) return resolved
  }

  return undefined
}

export function extractTradeParams(
  workspace: Blockly.WorkspaceSvg,
): TradeParamsResult {
  const blocks = workspace.getAllBlocks(false)

  const market = blocks.find(
    (block) => block.type === 'trade_definition_market',
  )
  const tradeType = blocks.find(
    (block) => block.type === 'trade_definition_tradetype',
  )
  const contract = blocks.find(
    (block) => block.type === 'trade_definition_contracttype',
  )
  const options = blocks.find(
    (block) => block.type === 'trade_definition_tradeoptions',
  )

  if (!market) return { ok: false, missingField: 'market' }
  if (!tradeType) return { ok: false, missingField: 'trade type' }
  if (!contract) return { ok: false, missingField: 'contract type' }
  if (!options) return { ok: false, missingField: 'trade options' }

  const symbol = String(market.getFieldValue('SYMBOL_LIST') || '')
  if (!symbol) return { ok: false, missingField: 'symbol' }

  const contractType = String(contract.getFieldValue('TYPE_LIST') || '')
  if (!contractType) return { ok: false, missingField: 'contract type' }

  const tradeTypeValue = String(
    tradeType.getFieldValue('TRADETYPE_LIST') || '',
  )
  if (!tradeTypeValue) return { ok: false, missingField: 'trade type' }

  const durationBlock = options.getInputTargetBlock('DURATION')
  const amountBlock = options.getInputTargetBlock('AMOUNT')
  const predictionBlock = options.getInputTargetBlock('PREDICTION')
  const barrierBlock = options.getInputTargetBlock('BARRIER')
  const secondBarrierBlock = options.getInputTargetBlock('SECOND_BARRIER')

  const duration = readNumericBlock(durationBlock)
  const amount = readNumericBlock(amountBlock)
  const prediction = readNumericBlock(predictionBlock)
  const barrier = readNumericBlock(barrierBlock)
  const secondBarrier = readNumericBlock(secondBarrierBlock)

  if (duration === undefined || duration <= 0) {
    return { ok: false, missingField: 'duration' }
  }

  if (amount === undefined || amount <= 0) {
    return { ok: false, missingField: 'stake amount' }
  }

  const durationUnit = String(
    options.getFieldValue('DURATIONTYPE_LIST') || 't',
  )
  const currency = String(
    options.getFieldValue('CURRENCY_LIST') || 'USD',
  )

  const result: TradeParams = {
    symbol,
    contract_type: contractType,
    trade_type: tradeTypeValue,
    duration,
    duration_unit: durationUnit,
    amount,
    currency,
  }

  if (prediction !== undefined) result.prediction = prediction
  if (barrier !== undefined) result.barrier = String(barrier)
  if (secondBarrier !== undefined) result.second_barrier = String(secondBarrier)

  return {
    ok: true,
    params: result,
    repairedInputs: [],
  }
}

/* =========================================================
SAFE BOT XML LOAD
========================================================= */

export type LoadBotResult =
  | { ok: true; repaired: boolean }
  | {
      ok: false
      reason: string
      missingField?: string
      loaded: boolean
    }

export async function loadBotXmlSafely(
  workspace: Blockly.WorkspaceSvg,
  xml: string,
  fetchSymbolsIfNeeded: () => Promise<RawSymbol[] | null>,
  currentlyLoadedSymbols: RawSymbol[] | null,
): Promise<LoadBotResult> {
  try {
    let symbols = currentlyLoadedSymbols

    if (!symbols?.length) {
      symbols = await fetchSymbolsIfNeeded()
    }

    if (symbols && symbols.length) {
      setGlobalMarketOptions(symbols)
    }

    if (!isValidBotXml(xml)) {
      return {
        ok: false,
        reason: 'The uploaded file is not valid Blockly XML.',
        loaded: false,
      }
    }

    const loaded = loadFromXml(workspace, xml)

    if (!loaded) {
      return {
        ok: false,
        reason:
          'Unable to load this Deriv bot XML. The file may contain unsupported blocks.',
        loaded: false,
      }
    }

    const params = extractTradeParams(workspace)

    if (!params.ok) {
      return {
        ok: false,
        reason: 'Missing or invalid trade field: ' + params.missingField,
        missingField: params.missingField,
        loaded: true,
      }
    }

    return {
      ok: true,
      repaired: params.repairedInputs.length > 0,
    }
  } catch (error) {
    console.error('[Bot XML Import]', error)

    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : 'Unknown XML import error.',
      loaded: false,
    }
  }
}

export { setGlobalMarketOptions } from './blocks'
export { createBotApi } from './botApi'

export type {
  BotApi,
  NotificationType,
  NotifyData,
} from './botApi'

export { generateBotCode } from './generators'