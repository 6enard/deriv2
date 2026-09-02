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

/* =========================================================
THEME
========================================================= */

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
  if (themeRegistered) {
    return
  }

  Blockly.Theme.defineTheme(
    'dbot_dark',
    {
      name: 'dbot_dark',

      base:
        Blockly.Themes.Zelos,

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
          darkThemeOverrides
            .toolboxBackground,

        flyoutBackgroundColour:
          darkThemeOverrides
            .flyoutBackground,

        flyoutOpacity:
          darkThemeOverrides
            .flyoutOpacity,

        scrollbarColour:
          darkThemeOverrides
            .scrollbarColour,

        insertionMarkerColour:
          darkThemeOverrides
            .insertionMarkerColour,

        insertionMarkerOpacity:
          darkThemeOverrides
            .insertionMarkerOpacity,

        cursorColour:
          darkThemeOverrides
            .cursorColour,
      },
    },
  )

  themeRegistered = true
}

export function ensureRegistered() {
  applyColours()
  registerTheme()
}

/* =========================================================
WORKSPACE
========================================================= */

export function createWorkspace(
  container: HTMLElement,
): Blockly.WorkspaceSvg {
  ensureRegistered()

  const mobile =
    typeof window !==
      'undefined' &&
    window.innerWidth < 1024

  return Blockly.inject(
    container,
    {
      toolbox,

      theme:
        'dbot_dark',

      renderer:
        'zelos',

      media:
        '/blockly-media/',

      grid: {
        spacing: 28,
        length: 3,
        colour: '#262626',
        snap: true,
      },

      zoom: {
        controls: true,
        wheel: true,
        startScale:
          mobile
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

const BLOCK_RENAMES:
  Record<string, string> = {
  trade:
    'trade_definition',

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

  tickdelay:
    'tick_delay',

  tick_delay:
    'tick_delay',

  math_number_positive:
    'math_number',

  buy:
    'purchase',

  purchase_conditions:
    'before_purchase',
}

const FIELD_RENAMES:
  Record<
    string,
    Record<string, string>
  > = {
  read_details: {
    DETAILS:
      'DETAIL_INDEX',
  },

  tick_delay: {
    TICKS:
      'TICKDELAYVALUE',

    TIMEOUTSTACK:
      'TICKDELAYSTACK',
  },

  console: {
    VALUE:
      'MESSAGE',
  },

  notify: {
    VALUE:
      'MESSAGE',
  },

  contract_check_result: {
    RESULT:
      'CHECK_RESULT',

    CHECKRESULT:
      'CHECK_RESULT',
  },
}

function renameBlocks(
  root: Element,
) {
  const blocks =
    Array.from(
      root.querySelectorAll(
        'block,shadow',
      ),
    )

  for (
    const block of blocks
  ) {
    const type =
      block.getAttribute(
        'type',
      )

    if (!type) {
      continue
    }

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
  const blocks =
    Array.from(
      root.querySelectorAll(
        'block,shadow',
      ),
    )

  for (
    const block of blocks
  ) {
    const type =
      block.getAttribute(
        'type',
      )

    if (!type) {
      continue
    }

    const mapping =
      FIELD_RENAMES[type]

    if (!mapping) {
      continue
    }

    for (
      const child of Array.from(
        block.children,
      )
    ) {
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

      if (!name) {
        continue
      }

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
  const fields =
    Array.from(
      root.querySelectorAll(
        'field',
      ),
    )

  for (
    const field of fields
  ) {
    const value =
      field.textContent
        ?.trim()
        .toUpperCase()

    if (
      value ===
      'TRUE'
    ) {
      field.textContent =
        'TRUE'
    } else if (
      value ===
      'FALSE'
    ) {
      field.textContent =
        'FALSE'
    }
  }
}

/* =========================================================
VARIABLE MIGRATION
========================================================= */

function migrateLegacyVariables(
  root: Element,
) {
  const doc =
    root.ownerDocument

  if (!doc) {
    return
  }

  let variablesElement =
    Array.from(
      root.children,
    ).find(
      (child) =>
        child.tagName ===
        'variables',
    )

  if (!variablesElement) {
    variablesElement =
      doc.createElement(
        'variables',
      )

    root.insertBefore(
      variablesElement,
      root.firstChild,
    )
  }

  const variablesById =
    new Map<
      string,
      string
    >()

  const variablesByName =
    new Map<
      string,
      string
    >()

  for (
    const child of Array.from(
      variablesElement.children,
    )
  ) {
    if (
      child.tagName !==
      'variable'
    ) {
      continue
    }

    const id =
      child.getAttribute(
        'id',
      )

    const name =
      child.textContent
        ?.trim() || ''

    if (
      !id ||
      !name
    ) {
      continue
    }

    variablesById.set(
      id,
      name,
    )

    if (
      !variablesByName.has(
        name,
      )
    ) {
      variablesByName.set(
        name,
        id,
      )
    }
  }

  const createVariableId =
    () => {
      let id = ''

      do {
        id =
          Blockly.utils
            .idGenerator
            .genUid()
      } while (
        variablesById.has(
          id,
        )
      )

      return id
    }

  const varFields =
    Array.from(
      root.querySelectorAll(
        'field[name="VAR"]',
      ),
    )

  for (
    const field of varFields
  ) {
    const rawValue =
      field.textContent
        ?.trim() || ''

    if (!rawValue) {
      continue
    }

    if (
      variablesById.has(
        rawValue,
      )
    ) {
      continue
    }

    let variableId =
      variablesByName.get(
        rawValue,
      )

    if (!variableId) {
      variableId =
        createVariableId()

      const variable =
        doc.createElement(
          'variable',
        )

      variable.setAttribute(
        'id',
        variableId,
      )

      variable.textContent =
        rawValue

      variablesElement.appendChild(
        variable,
      )

      variablesById.set(
        variableId,
        rawValue,
      )

      variablesByName.set(
        rawValue,
        variableId,
      )
    }

    field.textContent =
      variableId
  }
}

/* =========================================================
LEGACY TEXT JOIN
========================================================= */

function repairLegacyTextJoin(
  root: Element,
) {
  const blocks =
    Array.from(
      root.querySelectorAll(
        'block[type="text_join"],shadow[type="text_join"]',
      ),
    )

  for (
    const block of blocks
  ) {
    const variable =
      Array.from(
        block.children,
      ).find(
        (child) =>
          child.tagName ===
            'field' &&
          child.getAttribute(
            'name',
          ) ===
            'VARIABLE',
      )

    if (variable) {
      block.removeChild(
        variable,
      )
    }

    /*
     * Do not silently delete STACK
     * contents anymore.
     *
     * If an old XML contains STACK,
     * preserve the surrounding block
     * instead of destroying user data.
     */
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

  if (!value) {
    return
  }

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

  if (hasBlock) {
    return
  }

  const doc =
    block.ownerDocument

  if (!doc) {
    return
  }

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

  shadow.appendChild(
    field,
  )

  value.appendChild(
    shadow,
  )
}

function repairTradeOptions(
  root: Element,
) {
  const blocks =
    Array.from(
      root.querySelectorAll(
        'block[type="trade_definition_tradeoptions"]',
      ),
    )

  for (
    const block of blocks
  ) {
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

/* =========================================================
DROPDOWN XML REPAIR
========================================================= */

function findDirectField(
  block: Element,
  name: string,
): Element | null {
  return (
    Array.from(
      block.children,
    ).find(
      (child) =>
        child.tagName ===
          'field' &&
        child.getAttribute(
          'name',
        ) === name,
    ) || null
  )
}

function getFirstTradeTypeValue(
  category: string,
): string {
  const values:
    Record<string, string> = {
    updown:
      'risefall',

    touchnotouch:
      'touchnotouch',

    inout:
      'endsinout',

    digits:
      'matchesdiffers',

    multiplier:
      'multiplier',

    accumulator:
      'accumulator',
  }

  return (
    values[category] ||
    'risefall'
  )
}

function repairPurchaseField(
  root: Element,
) {
  const purchases =
    Array.from(
      root.querySelectorAll(
        'block[type="purchase"]',
      ),
    )

  for (
    const purchase of purchases
  ) {
    const field =
      findDirectField(
        purchase,
        'PURCHASE_LIST',
      )

    if (!field) {
      continue
    }

    if (
      field.textContent
        ?.trim()
    ) {
      continue
    }

    /*
     * Do not arbitrarily select DIGITOVER.
     *
     * Use the surrounding contract type
     * if one exists.
     */
    let contractType = ''

    const tradeDefinition =
      purchase.closest(
        'block[type="trade_definition"]',
      )

    if (
      tradeDefinition
    ) {
      const contract =
        tradeDefinition.querySelector(
          'block[type="trade_definition_contracttype"]',
        )

      if (contract) {
        contractType =
          findDirectField(
            contract,
            'TYPE_LIST',
          )
            ?.textContent
            ?.trim() || ''
      }
    }

    const allowed:
      Record<string, string> = {
      CALL: 'CALL',
      PUT: 'PUT',

      ONETOUCH:
        'ONETOUCH',

      NOTOUCH:
        'NOTOUCH',

      EXPIRYRANGE:
        'EXPIRYRANGE',

      EXPIRYMISS:
        'EXPIRYMISS',

      RANGE:
        'RANGE',

      UPORDOWN:
        'UPORDOWN',

      DIGITMATCH:
        'DIGITMATCH',

      DIGITDIFF:
        'DIGITDIFF',

      DIGITOVER:
        'DIGITOVER',

      DIGITUNDER:
        'DIGITUNDER',

      DIGITEVEN:
        'DIGITEVEN',

      DIGITODD:
        'DIGITODD',

      MULTUP:
        'MULTUP',

      MULTDOWN:
        'MULTDOWN',

      ACCU:
        'ACCU',
    }

    if (
      allowed[contractType]
    ) {
      field.textContent =
        allowed[contractType]
    }
  }
}

function repairTradeDefinitionFields(
  root: Element,
) {
  const tradeTypes =
    Array.from(
      root.querySelectorAll(
        'block[type="trade_definition_tradetype"]',
      ),
    )

  for (
    const block of tradeTypes
  ) {
    const category =
      findDirectField(
        block,
        'TRADETYPECAT_LIST',
      )

    const type =
      findDirectField(
        block,
        'TRADETYPE_LIST',
      )

    /*
     * These defaults are ONLY used when
     * the uploaded XML genuinely contains
     * an empty value.
     */
    if (
      category &&
      !category.textContent
        ?.trim()
    ) {
      category.textContent =
        'digits'
    }

    if (
      type &&
      !type.textContent
        ?.trim()
    ) {
      const categoryValue =
        category
          ?.textContent
          ?.trim() ||
        'digits'

      type.textContent =
        getFirstTradeTypeValue(
          categoryValue,
        )
    }
  }

  const contracts =
    Array.from(
      root.querySelectorAll(
        'block[type="trade_definition_contracttype"]',
      ),
    )

  for (
    const block of contracts
  ) {
    const field =
      findDirectField(
        block,
        'TYPE_LIST',
      )

    if (
      field &&
      !field.textContent
        ?.trim()
    ) {
      field.textContent =
        'both'
    }
  }

  repairPurchaseField(
    root,
  )
}

/* =========================================================
XML MIGRATION
========================================================= */

function migrateXml(
  root: Element,
) {
  renameBlocks(root)

  renameFields(root)

  normalizeXmlBooleans(root)

  migrateLegacyVariables(root)

  repairLegacyTextJoin(root)

  repairTradeDefinitionFields(
    root,
  )

  repairTradeOptions(root)

  return root
}

/* =========================================================
IMPORTED FIELD RESTORATION
========================================================= */

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

  for (
    const xmlBlock of xmlBlocks
  ) {
    const id =
      xmlBlock.getAttribute(
        'id',
      )

    if (!id) {
      continue
    }

    const workspaceBlock =
      workspace.getBlockById(
        id,
      )

    if (!workspaceBlock) {
      continue
    }

    for (
      const child of Array.from(
        xmlBlock.children,
      )
    ) {
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

      if (!name) {
        continue
      }

      const value =
        child.textContent
          ?.trim() || ''

      if (!value) {
        continue
      }

      const field =
        workspaceBlock.getField(
          name,
        )

      if (!field) {
        continue
      }

      /*
       * Dynamic dropdowns are restored
       * separately after all blocks exist.
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
        name ===
          'TYPE_LIST' ||
        name ===
          'PURCHASE_LIST' ||
        name === 'VAR'
      ) {
        continue
      }

      try {
        field.setValue(
          value,
        )
      } catch (
        error
      ) {
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
   * Restore dynamic dropdowns in dependency order.
   */
  for (
    const xmlBlock of xmlBlocks
  ) {
    const id =
      xmlBlock.getAttribute(
        'id',
      )

    if (!id) {
      continue
    }

    const block =
      workspace.getBlockById(
        id,
      )

    if (!block) {
      continue
    }

    if (
      block.type ===
      'trade_definition_market'
    ) {
      restoreDynamicField(
        block,
        xmlBlock,
        'MARKET_LIST',
      )

      restoreDynamicField(
        block,
        xmlBlock,
        'SUBMARKET_LIST',
      )

      restoreDynamicField(
        block,
        xmlBlock,
        'SYMBOL_LIST',
      )
    }
  }

  for (
    const xmlBlock of xmlBlocks
  ) {
    const id =
      xmlBlock.getAttribute(
        'id',
      )

    if (!id) {
      continue
    }

    const block =
      workspace.getBlockById(
        id,
      )

    if (
      !block ||
      block.type !==
        'trade_definition_tradetype'
    ) {
      continue
    }

    restoreDynamicField(
      block,
      xmlBlock,
      'TRADETYPECAT_LIST',
    )

    restoreDynamicField(
      block,
      xmlBlock,
      'TRADETYPE_LIST',
    )
  }

  for (
    const xmlBlock of xmlBlocks
  ) {
    const id =
      xmlBlock.getAttribute(
        'id',
      )

    if (!id) {
      continue
    }

    const block =
      workspace.getBlockById(
        id,
      )

    if (
      !block ||
      block.type !==
        'trade_definition_contracttype'
    ) {
      continue
    }

    restoreDynamicField(
      block,
      xmlBlock,
      'TYPE_LIST',
    )
  }

  for (
    const xmlBlock of xmlBlocks
  ) {
    const id =
      xmlBlock.getAttribute(
        'id',
      )

    if (!id) {
      continue
    }

    const block =
      workspace.getBlockById(
        id,
      )

    if (
      !block ||
      block.type !==
        'purchase'
    ) {
      continue
    }

    restoreDynamicField(
      block,
      xmlBlock,
      'PURCHASE_LIST',
    )
  }
}

function restoreDynamicField(
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
    xmlField.textContent
      ?.trim() || ''

  if (!value) {
    return
  }

  const field =
    block.getField(name)

  if (!field) {
    return
  }

  try {
    field.setValue(
      value,
    )
  } catch (
    error
  ) {
    console.warn(
      '[Bot XML] Could not restore dynamic field',
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

    /*
     * XML is now repaired BEFORE
     * Blockly receives it.
     */
    Blockly.Xml.domToWorkspace(
      dom,
      workspace,
    )

    /*
     * Dynamic fields are restored after
     * all dependent dropdowns exist.
     */
    restoreImportedTradeFields(
      workspace,
      dom,
    )

    Blockly.svgResize(
      workspace,
    )

    return true
  } catch (
    error
  ) {
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
    value ===
      undefined ||
    value === null ||
    value === ''
  ) {
    return undefined
  }

  const parsed =
    Number(value)

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : undefined
}

/* =========================================================
VARIABLE / NUMBER RESOLUTION
========================================================= */

function readVariableName(
  block: Blockly.Block,
): string {
  const field =
    block.getField('VAR')

  if (!field) {
    return ''
  }

  const id =
    field.getValue()

  if (!id) {
    return ''
  }

  const variable =
    block.workspace.getVariableById(
      id,
    )

  return (
    variable?.name || ''
  )
}

function readNumericBlock(
  block: Blockly.Block | null,
  seenVariables =
    new Set<string>(),
): number | undefined {
  if (!block) {
    return undefined
  }

  const direct =
    finiteNumber(
      block.getFieldValue(
        'NUM',
      ),
    )

  if (
    direct !== undefined
  ) {
    return direct
  }

  const value =
    finiteNumber(
      block.getFieldValue(
        'VALUE',
      ),
    )

  if (
    value !== undefined
  ) {
    return value
  }

  if (
    block.type ===
    'variables_get'
  ) {
    const field =
      block.getField('VAR')

    if (!field) {
      return undefined
    }

    const variableId =
      field.getValue()

    if (!variableId) {
      return undefined
    }

    if (
      seenVariables.has(
        variableId,
      )
    ) {
      return undefined
    }

    seenVariables.add(
      variableId,
    )

    const variable =
      block.workspace.getVariableById(
        variableId,
      )

    if (!variable) {
      return undefined
    }

    const variableName =
      variable.name

    const sets =
      block.workspace
        .getAllBlocks(false)
        .filter(
          (candidate) =>
            candidate.type ===
              'variables_set' &&
            readVariableName(
              candidate,
            ) ===
              variableName,
        )

    for (
      const setBlock of sets
    ) {
      const input =
        setBlock.getInputTargetBlock(
          'VALUE',
        )

      const resolved =
        readNumericBlock(
          input,
          new Set(
            seenVariables,
          ),
        )

      if (
        resolved !==
        undefined
      ) {
        return resolved
      }
    }
  }

  /*
   * Try any numeric value input.
   */
  for (
    const input of
      block.inputList
  ) {
    if (
      input.type !==
      Blockly.inputs
        .inputTypes
        .VALUE
    ) {
      continue
    }

    const target =
      input.connection
        ?.targetBlock()

    const resolved =
      readNumericBlock(
        target,
        new Set(
          seenVariables,
        ),
      )

    if (
      resolved !==
      undefined
    ) {
      return resolved
    }
  }

  return undefined
}

/* =========================================================
TRADE PARAM EXTRACTION
========================================================= */

export function extractTradeParams(
  workspace: Blockly.WorkspaceSvg,
): TradeParamsResult {
  const blocks =
    workspace.getAllBlocks(
      false,
    )

  const market =
    blocks.find(
      (block) =>
        block.type ===
        'trade_definition_market',
    )

  const tradeType =
    blocks.find(
      (block) =>
        block.type ===
        'trade_definition_tradetype',
    )

  const contract =
    blocks.find(
      (block) =>
        block.type ===
        'trade_definition_contracttype',
    )

  const options =
    blocks.find(
      (block) =>
        block.type ===
        'trade_definition_tradeoptions',
    )

  if (!market) {
    return {
      ok: false,
      missingField:
        'market',
    }
  }

  if (!tradeType) {
    return {
      ok: false,
      missingField:
        'trade type',
    }
  }

  if (!contract) {
    return {
      ok: false,
      missingField:
        'contract type',
    }
  }

  if (!options) {
    return {
      ok: false,
      missingField:
        'trade options',
    }
  }

  const symbol =
    String(
      market.getFieldValue(
        'SYMBOL_LIST',
      ) || '',
    )

  if (!symbol) {
    return {
      ok: false,
      missingField:
        'symbol',
    }
  }

  const contractType =
    String(
      contract.getFieldValue(
        'TYPE_LIST',
      ) || '',
    )

  if (!contractType) {
    return {
      ok: false,
      missingField:
        'contract type',
    }
  }

  const tradeTypeValue =
    String(
      tradeType.getFieldValue(
        'TRADETYPE_LIST',
      ) || '',
    )

  if (!tradeTypeValue) {
    return {
      ok: false,
      missingField:
        'trade type',
    }
  }

  const durationBlock =
    options.getInputTargetBlock(
      'DURATION',
    )

  const amountBlock =
    options.getInputTargetBlock(
      'AMOUNT',
    )

  const predictionBlock =
    options.getInputTargetBlock(
      'PREDICTION',
    )

  const barrierBlock =
    options.getInputTargetBlock(
      'BARRIER',
    )

  const secondBarrierBlock =
    options.getInputTargetBlock(
      'SECOND_BARRIER',
    )

  const duration =
    readNumericBlock(
      durationBlock,
    )

  const amount =
    readNumericBlock(
      amountBlock,
    )

  const prediction =
    readNumericBlock(
      predictionBlock,
    )

  const barrier =
    readNumericBlock(
      barrierBlock,
    )

  const secondBarrier =
    readNumericBlock(
      secondBarrierBlock,
    )

  if (
    duration ===
      undefined ||
    duration <= 0
  ) {
    return {
      ok: false,
      missingField:
        'duration',
    }
  }

  if (
    amount ===
      undefined ||
    amount <= 0
  ) {
    return {
      ok: false,
      missingField:
        'stake amount',
    }
  }

  const durationUnit =
    String(
      options.getFieldValue(
        'DURATIONTYPE_LIST',
      ) || 't',
    )

  const currency =
    String(
      options.getFieldValue(
        'CURRENCY_LIST',
      ) || 'USD',
    )

  const result: TradeParams =
    {
      symbol,

      contract_type:
        contractType,

      trade_type:
        tradeTypeValue,

      duration,

      duration_unit:
        durationUnit,

      amount,

      currency,
    }

  if (
    prediction !==
      undefined
  ) {
    result.prediction =
      prediction
  }

  if (
    barrier !==
      undefined
  ) {
    result.barrier =
      String(barrier)
  }

  if (
    secondBarrier !==
      undefined
  ) {
    result.second_barrier =
      String(
        secondBarrier,
      )
  }

  return {
    ok: true,
    params: result,
    repairedInputs: [],
  }
}

/* =========================================================
SAFE BOT XML LOAD
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

    if (
      symbols &&
      symbols.length
    ) {
      setGlobalMarketOptions(
        symbols,
      )
    }

    if (
      !isValidBotXml(xml)
    ) {
      return {
        ok: false,
        reason:
          'The uploaded file is not valid Blockly XML.',
      }
    }

    const loaded =
      loadFromXml(
        workspace,
        xml,
      )

    if (!loaded) {
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

    if (!params.ok) {
      return {
        ok: false,
        reason:
          'Missing or invalid trade field: ' +
          params.missingField,
      }
    }

    return {
      ok: true,
      repaired:
        params.repairedInputs
          .length > 0,
    }
  } catch (
    error
  ) {
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
  setGlobalMarketOptions,
} from './blocks'

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