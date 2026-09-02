import * as Blockly from 'blockly'
import 'blockly/blocks'

import {
  Colours,
  darkThemeOverrides,
} from './colours'

import {
  setGlobalMarketOptions,
  type RawSymbol,
} from './blocks'

import { toolbox } from './toolbox'
import {
  defaultWorkspaceXml,
} from './defaultWorkspace'

let themeRegistered = false

function applyColours() {
  const B =
    Blockly as unknown as {
      Colours: Record<
        string,
        unknown
      >
    }

  B.Colours = Colours
}

function registerTheme() {
  if (themeRegistered) return

  Blockly.Theme.defineTheme(
    'dbot_dark',
    {
      name: 'dbot_dark',

      base: Blockly.Themes.Zelos,

      categoryStyles: {
        trade_parameters: {
          colour:
            Colours.RootBlock
              .colour,
        },

        purchase_conditions: {
          colour:
            Colours.RootBlock
              .colour,
        },

        sell_conditions: {
          colour:
            Colours.RootBlock
              .colour,
        },

        trade_results: {
          colour:
            Colours.RootBlock
              .colour,
        },

        analysis: {
          colour:
            Colours.Base.colour,
        },

        utility: {
          colour:
            Colours.Base.colour,
        },

        technical_analysis: {
          colour:
            Colours.Base.colour,
        },

        indicators: {
          colour:
            Colours.Base.colour,
        },

        time: {
          colour:
            Colours.Base.colour,
        },

        candle: {
          colour:
            Colours.Base.colour,
        },

        miscellaneous: {
          colour:
            Colours.Base.colour,
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
        toolboxBackgroundColour:
          darkThemeOverrides.toolboxBackground,

        flyoutBackgroundColour:
          darkThemeOverrides.flyoutBackground,

        flyoutOpacity:
          darkThemeOverrides.flyoutOpacity,

        scrollbarColour:
          darkThemeOverrides.scrollbarColour,

        insertionMarkerColour:
          darkThemeOverrides.insertionMarkerColour,

        insertionMarkerOpacity:
          darkThemeOverrides.insertionMarkerOpacity,

        cursorColour:
          darkThemeOverrides.cursorColour,
      },
    },
  )

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

  return Blockly.inject(
    container,
    {
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
        startScale: mobile
          ? 0.75
          : 0.95,
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
    },
  )
}

export function loadDefaultWorkspace(
  workspace: Blockly.WorkspaceSvg,
) {
  workspace.clear()

  const dom =
    Blockly.utils.xml.textToDom(
      defaultWorkspaceXml,
    )

  Blockly.Xml.domToWorkspace(
    dom,
    workspace,
  )
}

export function workspaceToXml(
  workspace: Blockly.WorkspaceSvg,
) {
  return Blockly.Xml.domToText(
    Blockly.Xml.workspaceToDom(
      workspace,
    ),
  )
}

/* =========================================================
   XML COMPATIBILITY
========================================================= */

const BLOCK_RENAMES: Record<
  string,
  string
> = {
  trade: 'trade_definition',

  tradeOptions:
    'trade_definition_tradeoptions',

  trade_options:
    'trade_definition_tradeoptions',

  market:
    'trade_definition_market',

  tradeMarket:
    'trade_definition_market',

  tradeType:
    'trade_definition_tradetype',

  trade_type:
    'trade_definition_tradetype',

  contractType:
    'trade_definition_contracttype',

  contract_type:
    'trade_definition_contracttype',

  candleInterval:
    'trade_definition_candleinterval',

  check_result:
    'contract_check_result',

  contract_check_result:
    'contract_check_result',

  tickdelay: 'tick_delay',

  tick_delay: 'tick_delay',

  math_number_positive:
    'math_number',

  buy: 'purchase',

  purchase_conditions:
    'before_purchase',
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

    TIMEOUTSTACK:
      'TICKDELAYSTACK',
  },

  console: {
    VALUE: 'MESSAGE',
  },

  notify: {
    VALUE: 'MESSAGE',
  },

  contract_check_result: {
    RESULT: 'CHECK_RESULT',

    CHECKRESULT:
      'CHECK_RESULT',
  },
}

const VALUE_FIELD_ALIASES: Record<
  string,
  string[]
> = {
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

function renameBlocks(
  root: Element,
) {
  const blocks = Array.from(
    root.querySelectorAll(
      'block,shadow',
    ),
  )

  for (const block of blocks) {
    const type =
      block.getAttribute('type')

    if (!type) continue

    const replacement =
      BLOCK_RENAMES[type]

    if (replacement) {
      block.setAttribute(
        'type',
        replacement,
      )
    }
  }
}

function renameFields(
  root: Element,
) {
  const blocks = Array.from(
    root.querySelectorAll(
      'block,shadow',
    ),
  )

  for (const block of blocks) {
    const type =
      block.getAttribute('type')

    if (!type) continue

    const mapping =
      FIELD_RENAMES[type]

    if (!mapping) continue

    for (const child of Array.from(
      block.children,
    )) {
      if (
        child.tagName !==
        'field'
      ) {
        continue
      }

      const name =
        child.getAttribute(
          'name',
        )

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

function normalizeXmlBooleans(
  root: Element,
) {
  const fields = Array.from(
    root.querySelectorAll(
      'field',
    ),
  )

  for (const field of fields) {
    const value =
      field.textContent
        ?.trim()
        .toUpperCase()

    if (value === 'TRUE') {
      field.textContent = 'TRUE'
    } else if (
      value === 'FALSE'
    ) {
      field.textContent = 'FALSE'
    }
  }
}

function normalizeLegacyInputNames(
  root: Element,
) {
  const blocks = Array.from(
    root.querySelectorAll(
      'block,shadow',
    ),
  )

  for (const block of blocks) {
    const type =
      block.getAttribute('type')

    if (
      type !==
        'trade_definition_tradeoptions' &&
      type !== 'trade_definition'
    ) {
      continue
    }

    for (const input of Array.from(
      block.querySelectorAll(
        ':scope > value, :scope > statement',
      ),
    )) {
      const name =
        input.getAttribute(
          'name',
        )

      if (!name) continue

      if (
        name === 'STAKE' ||
        name === 'STAKE_AMOUNT'
      ) {
        input.setAttribute(
          'name',
          'AMOUNT',
        )
      }

      if (
        name === 'DURATION_VALUE'
      ) {
        input.setAttribute(
          'name',
          'DURATION',
        )
      }
    }
  }
}

function ensureMathNumberShadow(
  block: Element,
  inputName: string,
  defaultValue: string,
) {
  const value =
    Array.from(
      block.children,
    ).find(
      (child) =>
        child.tagName ===
          'value' &&
        child.getAttribute(
          'name',
        ) === inputName,
    )

  if (!value) return

  const hasBlock =
    Array.from(
      value.children,
    ).some(
      (child) =>
        child.tagName ===
          'block' ||
        child.tagName ===
          'shadow',
    )

  if (hasBlock) return

  const doc =
    block.ownerDocument

  if (!doc) return

  const shadow =
    doc.createElement(
      'shadow',
    )

  shadow.setAttribute(
    'type',
    'math_number',
  )

  const field =
    doc.createElement(
      'field',
    )

  field.setAttribute(
    'name',
    'NUM',
  )

  field.textContent =
    defaultValue

  shadow.appendChild(field)

  value.appendChild(shadow)
}

function repairTradeOptions(
  root: Element,
) {
  const optionsBlocks =
    Array.from(
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

/*
 * Repairs older Deriv text_join XML.
 *
 * Older versions may contain:
 *
 * <field name="VARIABLE">...</field>
 * <statement name="STACK">...</statement>
 *
 * The current text_join block does not have either
 * of those inputs. They are safely removed because
 * the actual text values are stored in the ADD inputs.
 */
function repairLegacyTextJoin(
  root: Element,
) {
  const blocks =
    Array.from(
      root.querySelectorAll(
        'block[type="text_join"],shadow[type="text_join"]',
      ),
    )

  for (const block of blocks) {
    const variable =
      Array.from(
        block.children,
      ).find(
        (child) =>
          child.tagName ===
            'field' &&
          child.getAttribute(
            'name',
          ) === 'VARIABLE',
      )

    if (variable) {
      block.removeChild(
        variable,
      )
    }

    const stack =
      Array.from(
        block.children,
      ).find(
        (child) =>
          child.tagName ===
            'statement' &&
          child.getAttribute(
            'name',
          ) === 'STACK',
      )

    if (stack) {
      block.removeChild(
        stack,
      )
    }
  }
}

function migrateLegacyTrade(
  root: Element,
) {
  const legacyTrades =
    Array.from(
      root.querySelectorAll(
        'block[type="trade_definition"]',
      ),
    )

  for (const trade of legacyTrades) {
    const existingOptions =
      trade.querySelector(
        ':scope > statement[name="TRADE_OPTIONS"]',
      )

    if (existingOptions) {
      continue
    }

    const fields =
      new Map<
        string,
        string
      >()

    for (const child of Array.from(
      trade.children,
    )) {
      if (
        child.tagName !==
        'field'
      ) {
        continue
      }

      const name =
        child.getAttribute(
          'name',
        )

      if (!name) continue

      fields.set(
        name,
        child.textContent || '',
      )
    }

    if (!fields.size) {
      continue
    }

    const doc =
      trade.ownerDocument

    if (!doc) continue

    const statement =
      doc.createElement(
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
      const field =
        doc.createElement(
          'field',
        )

      field.setAttribute(
        'name',
        name,
      )

      field.textContent =
        value

      parent.appendChild(field)
    }

    const market =
      doc.createElement(
        'block',
      )

    market.setAttribute(
      'type',
      'trade_definition_market',
    )

    addField(
      market,
      'MARKET_LIST',
      fields.get(
        'MARKET_LIST',
      ) ||
        fields.get(
          'MARKET',
        ) ||
        'synthetic_index',
    )

    addField(
      market,
      'SUBMARKET_LIST',
      fields.get(
        'SUBMARKET_LIST',
      ) ||
        fields.get(
          'SUBMARKET',
        ) ||
        '',
    )

    addField(
      market,
      'SYMBOL_LIST',
      fields.get(
        'SYMBOL_LIST',
      ) ||
        fields.get(
          'SYMBOL',
        ) ||
        '',
    )

    const tradeType =
      doc.createElement(
        'block',
      )

    tradeType.setAttribute(
      'type',
      'trade_definition_tradetype',
    )

    addField(
      tradeType,
      'TRADETYPECAT_LIST',
      fields.get(
        'TRADETYPECAT_LIST',
      ) ||
        fields.get(
          'TRADETYPECAT',
        ) ||
        '',
    )

    addField(
      tradeType,
      'TRADETYPE_LIST',
      fields.get(
        'TRADETYPE_LIST',
      ) ||
        fields.get(
          'TRADETYPE',
        ) ||
        '',
    )

    const contract =
      doc.createElement(
        'block',
      )

    contract.setAttribute(
      'type',
      'trade_definition_contracttype',
    )

    addField(
      contract,
      'TYPE_LIST',
      fields.get(
        'TYPE_LIST',
      ) ||
        fields.get(
          'CONTRACT_TYPE',
        ) ||
        fields.get(
          'CONTRACTTYPE',
        ) ||
        '',
    )

    const candle =
      doc.createElement(
        'block',
      )

    candle.setAttribute(
      'type',
      'trade_definition_candleinterval',
    )

    addField(
      candle,
      'CANDLEINTERVAL_LIST',
      fields.get(
        'CANDLEINTERVAL_LIST',
      ) || '60',
    )

    const restartBuy =
      doc.createElement(
        'block',
      )

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
      doc.createElement(
        'block',
      )

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

    const next1 =
      doc.createElement(
        'next',
      )

    next1.appendChild(
      tradeType,
    )

    market.appendChild(
      next1,
    )

    const next2 =
      doc.createElement(
        'next',
      )

    next2.appendChild(
      contract,
    )

    tradeType.appendChild(
      next2,
    )

    const next3 =
      doc.createElement(
        'next',
      )

    next3.appendChild(
      candle,
    )

    contract.appendChild(
      next3,
    )

    const next4 =
      doc.createElement(
        'next',
      )

    next4.appendChild(
      restartBuy,
    )

    candle.appendChild(
      next4,
    )

    const next5 =
      doc.createElement(
        'next',
      )

    next5.appendChild(
      restartError,
    )

    restartBuy.appendChild(
      next5,
    )

    statement.appendChild(
      market,
    )

    for (const child of Array.from(
      trade.children,
    )) {
      if (
        child.tagName ===
        'field'
      ) {
        trade.removeChild(
          child,
        )
      }
    }

    trade.insertBefore(
      statement,
      trade.firstChild,
    )
  }
}

/*
 * Repair empty values in the core trade definition.
 *
 * This protects against older XML where Blockly saved
 * a dependent dropdown before its parent dropdown had
 * finished populating.
 */
function repairTradeDefinitionFields(
  root: Element,
) {
  const tradeTypes =
    Array.from(
      root.querySelectorAll(
        'block[type="trade_definition_tradetype"]',
      ),
    )

  for (const block of tradeTypes) {
    const category =
      Array.from(
        block.children,
      ).find(
        (child) =>
          child.tagName ===
            'field' &&
          child.getAttribute(
            'name',
          ) ===
            'TRADETYPECAT_LIST',
      )

    const type =
      Array.from(
        block.children,
      ).find(
        (child) =>
          child.tagName ===
            'field' &&
          child.getAttribute(
            'name',
          ) ===
            'TRADETYPE_LIST',
      )

    if (
      category &&
      !category.textContent?.trim()
    ) {
      category.textContent =
        'updown'
    }

    if (
      type &&
      !type.textContent?.trim()
    ) {
      const categoryValue =
        category?.textContent?.trim() ||
        'updown'

      const first =
        getFirstTradeTypeValueFromCategory(
          categoryValue,
        )

      type.textContent =
        first || 'risefall'
    }
  }

  const contracts =
    Array.from(
      root.querySelectorAll(
        'block[type="trade_definition_contracttype"]',
      ),
    )

  for (const block of contracts) {
    const field =
      Array.from(
        block.children,
      ).find(
        (child) =>
          child.tagName ===
            'field' &&
          child.getAttribute(
            'name',
          ) === 'TYPE_LIST',
      )

    if (
      field &&
      !field.textContent?.trim()
    ) {
      field.textContent =
        'both'
    }
  }

  const markets =
    Array.from(
      root.querySelectorAll(
        'block[type="trade_definition_market"]',
      ),
    )

  for (const block of markets) {
    const market =
      findDirectField(
        block,
        'MARKET_LIST',
      )

    const submarket =
      findDirectField(
        block,
        'SUBMARKET_LIST',
      )

    const symbol =
      findDirectField(
        block,
        'SYMBOL_LIST',
      )

    if (
      market &&
      !market.textContent?.trim()
    ) {
      market.textContent =
        'synthetic_index'
    }

    /*
     * Do not invent submarket/symbol values here.
     *
     * They must come from the XML or the live
     * active-symbol data.
     */
    void submarket
    void symbol
  }
}

function findDirectField(
  block: Element,
  name: string,
) {
  return Array.from(
    block.children,
  ).find(
    (child) =>
      child.tagName ===
        'field' &&
      child.getAttribute(
        'name',
      ) === name,
  )
}

function getFirstTradeTypeValueFromCategory(
  category: string,
) {
  const values: Record<
    string,
    string
  > = {
    updown: 'risefall',

    touchnotouch:
      'touchnotouch',

    inout: 'endsinout',

    digits: 'matchesdiffers',

    multiplier: 'multiplier',

    accumulator:
      'accumulator',
  }

  return values[category] || ''
}

function migrateXml(
  root: Element,
) {
  renameBlocks(root)

  renameFields(root)

  normalizeXmlBooleans(root)

  normalizeLegacyInputNames(root)

  migrateLegacyTrade(root)

  repairLegacyTextJoin(root)

  repairTradeDefinitionFields(
    root,
  )

  repairTradeOptions(root)

  return root
}

/* =========================================================
   IMPORTED DROPDOWN RESTORATION
========================================================= */

/*
 * Blockly's dynamic dropdowns depend on other fields.
 *
 * Example:
 *
 * MARKET
 *   ↓
 * SUBMARKET
 *   ↓
 * SYMBOL
 *
 * and:
 *
 * TRADE CATEGORY
 *   ↓
 * TRADE TYPE
 *   ↓
 * CONTRACT TYPE
 *
 * During XML deserialization Blockly may construct the
 * dependent field before the parent field has received
 * its XML value.
 *
 * After import, restore the values in dependency order.
 */
function restoreImportedTradeFields(
  workspace: Blockly.WorkspaceSvg,
  root: Element,
) {
  const xmlBlocks =
    Array.from(
      root.querySelectorAll(
        'block',
      ),
    )

  /*
   * First restore all normal fields by block ID.
   *
   * Using IDs is important. Matching by block type
   * could accidentally apply the value from one
   * trade-definition block to another.
   */
  for (const xmlBlock of xmlBlocks) {
    const id =
      xmlBlock.getAttribute(
        'id',
      )

    if (!id) continue

    const workspaceBlock =
      workspace.getBlockById(id)

    if (!workspaceBlock) {
      continue
    }

    const xmlFields =
      Array.from(
        xmlBlock.children,
      ).filter(
        (child) =>
          child.tagName ===
          'field',
      )

    for (const xmlField of xmlFields) {
      const name =
        xmlField.getAttribute(
          'name',
        )

      if (!name) continue

      const value =
        xmlField.textContent?.trim() ||
        ''

      if (!value) continue

      /*
       * Dependent dropdowns are restored later in a
       * specific order.
       */
      if (
        name ===
          'MARKET_LIST' ||
        name ===
          'SUBMARKET_LIST' ||
        name ===
          'SYMBOL_LIST' ||
        name ===
          'TRADETYPECAT_LIST' ||
        name ===
          'TRADETYPE_LIST' ||
        name === 'TYPE_LIST'
      ) {
        continue
      }

      const field =
        workspaceBlock.getField(
          name,
        )

      if (!field) {
        continue
      }

      try {
        field.setValue(value)
      } catch (error) {
        console.warn(
          '[Bot XML] Unable to restore field',
          {
            type:
              workspaceBlock.type,
            name,
            value,
            error,
          },
        )
      }
    }
  }

  /*
   * Restore Market → Submarket → Symbol.
   */
  const marketXmlBlocks =
    xmlBlocks.filter(
      (block) =>
        block.getAttribute(
          'type',
        ) ===
        'trade_definition_market',
    )

  for (const xmlBlock of marketXmlBlocks) {
    const id =
      xmlBlock.getAttribute(
        'id',
      )

    if (!id) continue

    const block =
      workspace.getBlockById(id)

    if (!block) continue

    restoreField(
      block,
      xmlBlock,
      'MARKET_LIST',
    )

    restoreField(
      block,
      xmlBlock,
      'SUBMARKET_LIST',
    )

    restoreField(
      block,
      xmlBlock,
      'SYMBOL_LIST',
    )
  }

  /*
   * Restore Trade Category → Trade Type.
   */
  const tradeTypeXmlBlocks =
    xmlBlocks.filter(
      (block) =>
        block.getAttribute(
          'type',
        ) ===
        'trade_definition_tradetype',
    )

  for (const xmlBlock of tradeTypeXmlBlocks) {
    const id =
      xmlBlock.getAttribute(
        'id',
      )

    if (!id) continue

    const block =
      workspace.getBlockById(id)

    if (!block) continue

    restoreField(
      block,
      xmlBlock,
      'TRADETYPECAT_LIST',
    )

    restoreField(
      block,
      xmlBlock,
      'TRADETYPE_LIST',
    )
  }

  /*
   * Restore Trade Type → Contract Type.
   */
  const contractXmlBlocks =
    xmlBlocks.filter(
      (block) =>
        block.getAttribute(
          'type',
        ) ===
        'trade_definition_contracttype',
    )

  for (const xmlBlock of contractXmlBlocks) {
    const id =
      xmlBlock.getAttribute(
        'id',
      )

    if (!id) continue

    const block =
      workspace.getBlockById(id)

    if (!block) continue

    restoreField(
      block,
      xmlBlock,
      'TYPE_LIST',
    )
  }
}

function restoreField(
  block: Blockly.Block,
  xmlBlock: Element,
  name: string,
) {
  const xmlField =
    Array.from(
      xmlBlock.children,
    ).find(
      (child) =>
        child.tagName ===
          'field' &&
        child.getAttribute(
          'name',
        ) === name,
    )

  if (!xmlField) {
    return
  }

  const value =
    xmlField.textContent?.trim() ||
    ''

  if (!value) {
    return
  }

  const field =
    block.getField(name)

  if (!field) {
    return
  }

  try {
    field.setValue(value)
  } catch (error) {
    /*
     * Do not abort the entire bot import because a
     * single legacy dropdown value is no longer valid.
     *
     * The importer has already preserved the XML.
     */
    console.warn(
      '[Bot XML] Could not restore dependent field',
      {
        block:
          block.type,
        name,
        value,
        error,
      },
    )
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

    Blockly.Xml.domToWorkspace(
      dom,
      workspace,
    )

    /*
     * Blockly has now created the blocks.
     *
     * Restore imported dynamic dropdown values
     * after all blocks exist and all dependencies
     * can be resolved.
     */
    restoreImportedTradeFields(
      workspace,
      dom,
    )

    Blockly.svgResize(
      workspace,
    )

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
    if (!xml.trim()) {
      return false
    }

    Blockly.utils.xml.textToDom(
      xml,
    )

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

  const number =
    Number(value)

  return Number.isFinite(number)
    ? number
    : undefined
}

/*
 * Resolves a numeric Blockly block.
 *
 * Supports:
 *
 * math_number
 * variables_get
 * direct VALUE fields
 *
 * Most importantly, this lets:
 *
 * Amount → Stake
 *
 * resolve to:
 *
 * Stake = 1
 *
 * from the initialization section.
 */
function readNumericBlock(
  block: Blockly.Block | null,
): number | undefined {
  if (!block) {
    return undefined
  }

  /*
   * Standard math_number block.
   */
  const direct =
    finiteNumber(
      block.getFieldValue(
        'NUM',
      ),
    )

  if (direct !== undefined) {
    return direct
  }

  /*
   * Some legacy numeric blocks use VALUE.
   */
  const value =
    finiteNumber(
      block.getFieldValue(
        'VALUE',
      ),
    )

  if (value !== undefined) {
    return value
  }

  /*
   * Resolve variables_get.
   *
   * Example:
   *
   * Amount
   *   └── variables_get
   *         VAR = Stake
   *
   * Initialization:
   *
   * variables_set
   *   VAR = Stake
   *   VALUE = math_number(1)
   */
  if (
    block.type ===
    'variables_get'
  ) {
    const variableField =
      block.getField('VAR')

    if (!variableField) {
      return undefined
    }

    const variableId =
      variableField.getValue()

    if (!variableId) {
      return undefined
    }

    const variable =
      block.workspace.getVariableById(
        variableId,
      )

    if (!variable) {
      return undefined
    }

    const allBlocks =
      block.workspace.getAllBlocks(
        false,
      )

    /*
     * Find the corresponding variables_set.
     */
    for (const candidate of allBlocks) {
      if (
        candidate.type !==
        'variables_set'
      ) {
        continue
      }

      const candidateVariable =
        candidate.getField(
          'VAR',
        )

      if (!candidateVariable) {
        continue
      }

      if (
        candidateVariable.getValue() !==
        variableId
      ) {
        continue
      }

      /*
       * Current Blockly uses VALUE.
       */
      const valueBlock =
        candidate.getInputTargetBlock(
          'VALUE',
        )

      const resolved =
        readNumericBlock(
          valueBlock,
        )

      if (
        resolved !==
        undefined
      ) {
        return resolved
      }

      /*
       * Legacy Deriv XML can use other names.
       */
      for (const inputName of [
        'AMOUNT',
        'STAKE',
        'VALUE',
      ]) {
        const legacyValueBlock =
          candidate.getInputTargetBlock(
            inputName,
          )

        const legacyResolved =
          readNumericBlock(
            legacyValueBlock,
          )

        if (
          legacyResolved !==
          undefined
        ) {
          return legacyResolved
        }
      }
    }

    /*
     * If the variable does not have a variables_set,
     * try finding an initialization block by variable
     * name. This helps with some older XML formats where
     * variable IDs changed during import.
     */
    for (const candidate of allBlocks) {
      if (
        candidate.type !==
        'variables_set'
      ) {
        continue
      }

      const candidateVariable =
        candidate.getField(
          'VAR',
        )

      if (!candidateVariable) {
        continue
      }

      const candidateId =
        candidateVariable.getValue()

      const candidateVariableObject =
        candidateId
          ? block.workspace.getVariableById(
              candidateId,
            )
          : null

      if (
        !candidateVariableObject
      ) {
        continue
      }

      if (
        candidateVariableObject.name !==
        variable.name
      ) {
        continue
      }

      for (const inputName of [
        'VALUE',
        'AMOUNT',
        'STAKE',
      ]) {
        const valueBlock =
          candidate.getInputTargetBlock(
            inputName,
          )

        const resolved =
          readNumericBlock(
            valueBlock,
          )

        if (
          resolved !==
          undefined
        ) {
          return resolved
        }
      }
    }
  }

  return undefined
}

function numberValue(
  block: Blockly.Block,
  inputNames:
    | string
    | string[],
) {
  const names =
    Array.isArray(inputNames)
      ? inputNames
      : [inputNames]

  for (const name of names) {
    const target =
      block.getInputTargetBlock(
        name,
      )

    const value =
      readNumericBlock(
        target,
      )

    if (
      value !== undefined
    ) {
      return value
    }

    const fieldValue =
      finiteNumber(
        block.getFieldValue(
          name,
        ),
      )

    if (
      fieldValue !== undefined
    ) {
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
      block.getFieldValue(
        name,
      )

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !==
        ''
    ) {
      return String(value)
    }
  }

  return ''
}

function getTradeChain(
  root: Blockly.Block,
) {
  const blocks: Blockly.Block[] =
    []

  let block =
    root.getInputTargetBlock(
      'TRADE_OPTIONS',
    )

  while (block) {
    blocks.push(block)

    block =
      block.getNextBlock()
  }

  return blocks
}

function findBlockByType(
  blocks: Blockly.Block[],
  type: string,
) {
  return blocks.find(
    (block) =>
      block.type === type,
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
  return textValue(
    block,
    names,
  )
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
      ? textValue(
          market,
          [
            'SYMBOL_LIST',
            'SYMBOL',
          ],
        )
      : ''

  let tradeType =
    tradeTypeBlock
      ? textValue(
          tradeTypeBlock,
          [
            'TRADETYPE_LIST',
            'TRADE_TYPE',
          ],
        )
      : ''

  let contractType =
    contractBlock
      ? textValue(
          contractBlock,
          [
            'TYPE_LIST',
            'CONTRACT_TYPE',
          ],
        )
      : ''

  /*
   * Legacy XML sometimes stores these fields directly
   * on the root trade_definition block.
   */
  if (!symbol) {
    symbol = textValue(
      root,
      [
        'SYMBOL_LIST',
        'SYMBOL',
      ],
    )
  }

  if (!tradeType) {
    tradeType = textValue(
      root,
      [
        'TRADETYPE_LIST',
        'TRADETYPE',
      ],
    )
  }

  if (!contractType) {
    contractType =
      textValue(
        root,
        [
          'TYPE_LIST',
          'CONTRACT_TYPE',
          'CONTRACTTYPE',
        ],
      )
  }

  if (!symbol) {
    return {
      ok: false,
      missingField:
        'symbol',
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

  const repairedInputs: string[] =
    []

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

  /*
   * If Amount → Stake and Stake is initialized
   * to a numeric value, readNumericBlock() above
   * resolves it here.
   */
  if (
    amount === undefined
  ) {
    return {
      ok: false,
      missingField:
        'amount',
    }
  }

  let durationUnit =
    textValue(
      options,
      [
        'DURATIONTYPE_LIST',
        'DURATION_UNIT',
        'DURATIONUNIT',
      ],
    )

  let currency =
    textValue(
      options,
      [
        'CURRENCY_LIST',
        'CURRENCY',
      ],
    )

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
      : finiteNumber(
          barrier,
        )

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
        (normalizedPrediction !==
        undefined
          ? String(
              normalizedPrediction,
            )
          : undefined),

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

    if (
      !symbols?.length
    ) {
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
        params.repairedInputs
          .length > 0,
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

/* =========================================================
   EXPORTS
========================================================= */

export {
  createBotApi,
} from './botApi'

export type {
  BotApi,
  NotificationType,
  NotifyData,
} from './botApi'

export {
  generateBotCode,
} from './generators'

export {
  setGlobalMarketOptions,
}