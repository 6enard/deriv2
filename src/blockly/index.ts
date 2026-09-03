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

const legacyVariableFields =
Array.from(
root.querySelectorAll(
'field[name="VARIABLE"]',
),
)

for (
const field of legacyVariableFields
) {
const rawValue =
field.textContent
?.trim() || ''

const variableId =
  field.getAttribute(
    'id',
  )

if (
  variableId &&
  variablesById.has(
    variableId,
  )
) {
  continue
}

if (!rawValue) {
  continue
}

let id =
  variableId ||
  variablesByName.get(
    rawValue,
  )

if (!id) {
  id =
    createVariableId()

  const variable =
    doc.createElement(
      'variable',
    )

  variable.setAttribute(
    'id',
    id,
  )

  variable.textContent =
    rawValue

  variablesElement.appendChild(
    variable,
  )

  variablesById.set(
    id,
    rawValue,
  )

  variablesByName.set(
    rawValue,
    id,
  )
}

field.setAttribute(
  'id',
  id,
)

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
const hasStack =
Array.from(
block.children,
).some(
(child) =>
child.tagName ===
'statement' &&
child.getAttribute(
'name',
) === 'STACK',
)

const hasVariable =
  Array.from(
    block.children,
  ).some(
    (child) =>
      child.tagName ===
        'field' &&
      child.getAttribute(
        'name',
      ) ===
        'VARIABLE',
  )

if (
  hasStack ||
  hasVariable
) {
  block.setAttribute(
    'type',
    'text_join_legacy',
  )
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

function repairMarketFields(
root: Element,
) {
const marketBlock =
root.querySelector(
'block[type="trade_definition_market"]',
)

if (!marketBlock) {
return
}

const marketField =
findDirectField(
marketBlock,
'MARKET_LIST',
)

const submarketField =
findDirectField(
marketBlock,
'SUBMARKET_LIST',
)

const symbolField =
findDirectField(
marketBlock,
'SYMBOL_LIST',
)

let market =
marketField
?.textContent
?.trim() || ''

if (
!market
) {
market =
getFirstMarketValue()

if (
  marketField &&
  market
) {
  marketField.textContent =
    market
}

}

let submarket =
submarketField
?.textContent
?.trim() || ''

if (
!submarket &&
market
) {
submarket =
getFirstSubmarketValue(
market,
)

if (
  submarketField &&
  submarket
) {
  submarketField.textContent =
    submarket
}

}

let symbol =
symbolField
?.textContent
?.trim() || ''

if (
!symbol &&
submarket
) {
symbol =
getFirstSymbolValue(
submarket,
)

if (
  symbolField &&
  symbol
) {
  symbolField.textContent =
    symbol
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

if (
  category &&
  !category.textContent
    ?.trim()
) {
  category.textContent =
    getFirstTradeTypeCategoryValue()
}

const categoryValue =
  category
    ?.textContent
    ?.trim() ||
  getFirstTradeTypeCategoryValue()

if (
  type &&
  !type.textContent
    ?.trim()
) {
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
  const tradeTypeBlock =
    root.querySelector(
      'block[type="trade_definition_tradetype"]',
    )

  const tradeType =
    tradeTypeBlock
      ? String(
          findDirectField(
            tradeTypeBlock,
            'TRADETYPE_LIST',
          )
            ?.textContent
            ?.trim() || '',
        )
      : ''

  field.textContent =
    getFirstContractTypeValue(
      tradeType,
    ) || 'both'
}

}
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

const tradeTypeBlock =
root.querySelector(
'block[type="trade_definition_tradetype"]',
)

const tradeType =
tradeTypeBlock
? String(
findDirectField(
tradeTypeBlock,
'TRADETYPE_LIST',
)
?.textContent
?.trim() || '',
)
: ''

const contractBlock =
root.querySelector(
'block[type="trade_definition_contracttype"]',
)

const contractType =
contractBlock
? String(
findDirectField(
contractBlock,
'TYPE_LIST',
)
?.textContent
?.trim() || '',
)
: ''

let defaultPurchase =
''

if (
contractType &&
contractType !== 'both'
) {
defaultPurchase =
contractType
} else {
defaultPurchase =
getFirstPurchaseValue(
tradeType,
)
}

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

if (
  defaultPurchase
) {
  field.textContent =
    defaultPurchase
}

}
}

function migrateXml(
root: Element,
) {
renameBlocks(root)

renameFields(root)

normalizeXmlBooleans(root)

migrateLegacyVariables(root)

repairLegacyTextJoin(root)

repairMarketFields(root)

repairTradeDefinitionFields(
root,
)

repairPurchaseField(root)

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
    name ===
      'VAR' ||
    name ===
      'VARIABLE'
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
  !block
) {
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

Blockly.Xml.domToWorkspace(
  dom,
  workspace,
)

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
      input ?? null,
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
    target ?? null,
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