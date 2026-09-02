import * as Blockly from 'blockly'
import { Colours } from './colours'

export interface RawSymbol {
market: string
market_display_name?: string
submarket: string
submarket_display_name?: string
underlying_symbol?: string
symbol?: string
underlying_symbol_name?: string
display_name?: string
exchange_is_open: number
pip_size?: number
pip?: number
}

let marketOptions: [string, string][] = [['', '']]
let submarketOptionsByMarket: Record<string, [string, string][]> = {}
let symbolOptionsBySubmarket: Record<string, [string, string][]> = {}

const tradeTypeCategoryOptions: [string, string][] = [
['Up/Down', 'updown'],
['Touch/No Touch', 'touchnotouch'],
['In/Out', 'inout'],
['Digits', 'digits'],
['Multiplier', 'multiplier'],
['Accumulator', 'accumulator'],
]

const tradeTypeOptionsByCategory: Record<string, [string, string][]> = {
updown: [
['Rise/Fall', 'risefall'],
['Higher/Lower', 'higherlower'],
],
touchnotouch: [
['Touch/No Touch', 'touchnotouch'],
],
inout: [
['Ends In/Out', 'endsinout'],
['Stays In/Goes Out', 'staysinout'],
],
digits: [
['Matches/Differs', 'matchesdiffers'],
['Even/Odd', 'evenodd'],
['Over/Under', 'overunder'],
],
multiplier: [
['Multiplier Up/Down', 'multiplier'],
],
accumulator: [
['Accumulator', 'accumulator'],
],
}

const contractTypeOptionsByTradeType: Record<
string,
[string, string][]

> = {
> risefall: [
> ['Rise/Fall (both)', 'both'],
> ['Rise', 'CALL'],
> ['Fall', 'PUT'],
> ],
> higherlower: [
> ['Higher/Lower (both)', 'both'],
> ['Higher', 'CALL'],
> ['Lower', 'PUT'],
> ],
> touchnotouch: [
> ['Touch/No Touch (both)', 'both'],
> ['Touch', 'ONETOUCH'],
> ['No Touch', 'NOTOUCH'],
> ],
> endsinout: [
> ['Ends Between/Outside (both)', 'both'],
> ['Ends Between', 'EXPIRYRANGE'],
> ['Ends Outside', 'EXPIRYMISS'],
> ],
> staysinout: [
> ['Stays Between/Goes Outside (both)', 'both'],
> ['Stays Between', 'RANGE'],
> ['Goes Outside', 'UPORDOWN'],
> ],
> matchesdiffers: [
> ['Matches/Differs (both)', 'both'],
> ['Matches', 'DIGITMATCH'],
> ['Differs', 'DIGITDIFF'],
> ],
> evenodd: [
> ['Even/Odd (both)', 'both'],
> ['Even', 'DIGITEVEN'],
> ['Odd', 'DIGITODD'],
> ],
> overunder: [
> ['Over/Under (both)', 'both'],
> ['Over', 'DIGITOVER'],
> ['Under', 'DIGITUNDER'],
> ],
> multiplier: [
> ['Multiplier Up/Down (both)', 'both'],
> ['Up', 'MULTUP'],
> ['Down', 'MULTDOWN'],
> ],
> accumulator: [
> ['Accumulator (both)', 'both'],
> ['Accumulate', 'ACCU'],
> ],
> }

function prettifyKey(key: string) {
return key
.split('_')
.filter(Boolean)
.map(
(x) =>
x.charAt(0).toUpperCase() +
x.slice(1),
)
.join(' ')
}

export function setGlobalMarketOptions(
rawSymbols: RawSymbol[],
) {
const markets: [string, string][] = []
const submarkets: Record<
string,
[string, string][]

> = {}
> const symbols: Record<
> string,
> [string, string][]
> = {}

for (const s of rawSymbols) {
const market = s.market
const submarket = s.submarket
const symbol =
s.underlying_symbol ||
s.symbol ||
''

```
if (
  !market ||
  !submarket ||
  !symbol
) {
  continue
}

if (!submarkets[market]) {
  markets.push([
    s.market_display_name ||
      prettifyKey(market),
    market,
  ])

  submarkets[market] = []
}

if (
  !submarkets[market].some(
    (x) => x[1] === submarket,
  )
) {
  submarkets[market].push([
    s.submarket_display_name ||
      prettifyKey(submarket),
    submarket,
  ])
}

if (!symbols[submarket]) {
  symbols[submarket] = []
}

if (
  !symbols[submarket].some(
    (x) => x[1] === symbol,
  )
) {
  symbols[submarket].push([
    s.underlying_symbol_name ||
      s.display_name ||
      symbol,
    symbol,
  ])
}
```

}

if (!markets.length) {
return false
}

marketOptions = markets
submarketOptionsByMarket = submarkets
symbolOptionsBySubmarket = symbols

return true
}

function ensureValue<T extends [string, string]>(
options: T[],
current: string,
): T[] {
if (
options.some(
(x) => x[1] === current,
)
) {
return options
}

if (current) {
return [
[current, current] as T,
...options,
]
}

if (options.length) {
return options
}

return ([['', '']] as T[])
}

function marketMenu(
this: Blockly.FieldDropdown,
) {
const block =
this.getSourceBlock()

const value =
block?.getFieldValue(
'MARKET_LIST',
) || ''

return ensureValue(
marketOptions,
value,
)
}

function submarketMenu(
this: Blockly.FieldDropdown,
) {
const block =
this.getSourceBlock()

if (!block) {
return [['', '']]
}

const market =
block.getFieldValue(
'MARKET_LIST',
)

const value =
block.getFieldValue(
'SUBMARKET_LIST',
)

return ensureValue(
submarketOptionsByMarket[
market
] || [],
value,
)
}

function symbolMenu(
this: Blockly.FieldDropdown,
) {
const block =
this.getSourceBlock()

if (!block) {
return [['', '']]
}

const submarket =
block.getFieldValue(
'SUBMARKET_LIST',
)

const value =
block.getFieldValue(
'SYMBOL_LIST',
)

return ensureValue(
symbolOptionsBySubmarket[
submarket
] || [],
value,
)
}

function tradeCategoryMenu(
this: Blockly.FieldDropdown,
) {
const block =
this.getSourceBlock()

const value =
block?.getFieldValue(
'TRADETYPECAT_LIST',
) || ''

return ensureValue(
tradeTypeCategoryOptions,
value,
)
}

function tradeTypeMenu(
this: Blockly.FieldDropdown,
) {
const block =
this.getSourceBlock()

if (!block) {
return [
...tradeTypeOptionsByCategory.updown,
]
}

const category =
block.getFieldValue(
'TRADETYPECAT_LIST',
) || ''

const value =
block.getFieldValue(
'TRADETYPE_LIST',
) || ''

const options =
tradeTypeOptionsByCategory[
category
] ||
Object.values(
tradeTypeOptionsByCategory,
).flat()

return ensureValue(
options,
value,
)
}

export function findPairedTradeTypeBlock(
block: Blockly.Block,
) {
let cursor: Blockly.Block | null =
block

while (cursor) {
if (
cursor.type ===
'trade_definition_tradetype'
) {
return cursor
}

```
cursor =
  cursor.getPreviousBlock()
```

}

return null
}

function allContractTypes() {
const map =
new Map<string, string>()

Object.values(
contractTypeOptionsByTradeType,
)
.flat()
.forEach(
([label, value]) => {
if (!map.has(value)) {
map.set(value, label)
}
},
)

return Array.from(
map.entries(),
).map(
([value, label]) =>
[label, value] as [
string,
string,
],
)
}

function contractTypeMenu(
this: Blockly.FieldDropdown,
) {
const block =
this.getSourceBlock()

if (!block) {
return allContractTypes()
}

const paired =
findPairedTradeTypeBlock(
block,
)

const value =
block.getFieldValue(
'TYPE_LIST',
) || ''

if (!paired) {
return ensureValue(
allContractTypes(),
value,
)
}

const tradeType =
paired.getFieldValue(
'TRADETYPE_LIST',
) || ''

const options =
contractTypeOptionsByTradeType[
tradeType
] || allContractTypes()

return ensureValue(
options,
value,
)
}

export function getPurchaseListOptions(
workspace: Blockly.Workspace,
): [string, string][] {
const blocks =
workspace.getAllBlocks(false)

const tradeTypeBlock =
blocks.find(
(b) =>
b.type ===
'trade_definition_tradetype',
)

const contractTypeBlock =
blocks.find(
(b) =>
b.type ===
'trade_definition_contracttype',
)

const tradeType =
String(
tradeTypeBlock?.getFieldValue(
'TRADETYPE_LIST',
) || '',
)

const contractType =
String(
contractTypeBlock?.getFieldValue(
'TYPE_LIST',
) || '',
)

const list =
contractTypeOptionsByTradeType[
tradeType
] || []

const real =
list.filter(
(x) => x[1] !== 'both',
)

if (
contractType &&
contractType !== 'both'
) {
const matched =
real.filter(
(x) =>
x[1] ===
contractType,
)

```
return matched.length
  ? matched
  : real
```

}

return real.length
? real
: allContractTypes().filter(
(x) => x[1] !== 'both',
)
}

function purchaseMenu(
this: Blockly.FieldDropdown,
) {
const block =
this.getSourceBlock()

if (!block) {
return [['CALL', 'CALL']]
}

const value =
block.getFieldValue(
'PURCHASE_LIST',
) || ''

return ensureValue(
getPurchaseListOptions(
block.workspace,
),
value,
)
}

export function getFirstMarketValue() {
return (
marketOptions[0]?.[1] || ''
)
}

export function getFirstSubmarketValue(
market: string,
) {
return (
submarketOptionsByMarket[
market
]?.[0]?.[1] || ''
)
}

export function getFirstSymbolValue(
submarket: string,
) {
return (
symbolOptionsBySubmarket[
submarket
]?.[0]?.[1] || ''
)
}

export function getFirstTradeTypeCategoryValue() {
return (
tradeTypeCategoryOptions[
0
]?.[1] || ''
)
}

export function getFirstTradeTypeValue(
category: string,
) {
return (
tradeTypeOptionsByCategory[
category
]?.[0]?.[1] || ''
)
}

export function getFirstContractTypeValue(
type: string,
) {
return (
contractTypeOptionsByTradeType[
type
]?.[0]?.[1] || ''
)
}

export function getFirstPurchaseValue(
tradeType: string,
) {
return (
contractTypeOptionsByTradeType[
tradeType
]?.find(
([, value]) =>
value !== 'both',
)?.[1] || ''
)
}

export function isValidMarketValue(
v: string,
) {
return marketOptions.some(
(x) => x[1] === v,
)
}

export function isValidSubmarketValue(
m: string,
v: string,
) {
return (
submarketOptionsByMarket[
m
] || []
).some(
(x) => x[1] === v,
)
}

export function isValidSymbolValue(
s: string,
v: string,
) {
return (
symbolOptionsBySubmarket[
s
] || []
).some(
(x) => x[1] === v,
)
}

export function isValidTradeTypeCategoryValue(
v: string,
) {
return tradeTypeCategoryOptions.some(
(x) => x[1] === v,
)
}

export function isValidTradeTypeValue(
c: string,
v: string,
) {
return (
tradeTypeOptionsByCategory[
c
] || []
).some(
(x) => x[1] === v,
)
}

export function isValidContractTypeValue(
t: string,
v: string,
) {
return (
contractTypeOptionsByTradeType[
t
] || []
).some(
(x) => x[1] === v,
)
}

function defineBlock(
name: string,
json: () => Record<string, unknown>,
extra?: (
block: Blockly.Block,
) => void,
) {
Blockly.Blocks[name] = {
init(this: Blockly.Block) {
;(
this as any
).jsonInit(json())

```
  extra?.(this)
},
```

}
}

/* ROOT */

defineBlock(
'trade_definition',
() => ({
message0: '%1',
args0: [
{
type: 'field_label',
text: '1. Trade parameters',
},
],

```
message1: '%1',
args1: [
  {
    type: 'input_statement',
    name: 'TRADE_OPTIONS',
  },
],

message2:
  'Run once at start:',

message3: '%1',
args3: [
  {
    type: 'input_statement',
    name: 'INITIALIZATION',
  },
],

message4:
  'Trade options:',

message5: '%1',
args5: [
  {
    type: 'input_statement',
    name: 'SUBMARKET',
  },
],

colour:
  Colours.RootBlock.colour,

colourSecondary:
  Colours.RootBlock
    .colourSecondary,

colourTertiary:
  Colours.RootBlock
    .colourTertiary,
```

}),
(b) =>
b.setDeletable(false),
)

/* TRADE STACK */

defineBlock(
'trade_definition_market',
() => ({
message0:
'Market: %1 > %2 > %3',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'MARKET_LIST',
    options: marketMenu,
  },

  {
    type: 'field_dropdown',
    name: 'SUBMARKET_LIST',
    options: submarketMenu,
  },

  {
    type: 'field_dropdown',
    name: 'SYMBOL_LIST',
    options: symbolMenu,
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'trade_definition_tradetype',
() => ({
message0:
'Trade type: %1 > %2',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'TRADETYPECAT_LIST',
    options:
      tradeCategoryMenu,
  },

  {
    type: 'field_dropdown',
    name: 'TRADETYPE_LIST',
    options: tradeTypeMenu,
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'trade_definition_contracttype',
() => ({
message0:
'Contract type: %1',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'TYPE_LIST',
    options:
      contractTypeMenu,
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'trade_definition_candleinterval',
() => ({
message0:
'Candle interval: %1',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'CANDLEINTERVAL_LIST',
    options: [
      ['1 minute', '60'],
      ['2 minutes', '120'],
      ['3 minutes', '180'],
      ['5 minutes', '300'],
      ['10 minutes', '600'],
      ['15 minutes', '900'],
      ['30 minutes', '1800'],
      ['1 hour', '3600'],
      ['2 hours', '7200'],
      ['4 hours', '14400'],
      ['8 hours', '28800'],
      ['1 day', '86400'],
    ],
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'trade_definition_restartbuysell',
() => ({
message0:
'Restart buy/sell on error: %1',

```
args0: [
  {
    type: 'field_checkbox',
    name: 'TIME_MACHINE_ENABLED',
    checked: false,
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'trade_definition_restartonerror',
() => ({
message0:
'Restart on error: %1',

```
args0: [
  {
    type: 'field_checkbox',
    name: 'RESTARTONERROR',
    checked: true,
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'trade_definition_tradeoptions',
() => ({
message0:
'Duration: %1 %2',

```
args0: [
  {
    type: 'input_value',
    name: 'DURATION',
    check: 'Number',
  },

  {
    type: 'field_dropdown',
    name: 'DURATIONTYPE_LIST',
    options: [
      ['ticks', 't'],
      ['seconds', 's'],
      ['minutes', 'm'],
      ['hours', 'h'],
    ],
  },
],

message1:
  'Amount: %1 %2',

args1: [
  {
    type: 'input_value',
    name: 'AMOUNT',
    check: 'Number',
  },

  {
    type: 'field_dropdown',
    name: 'CURRENCY_LIST',
    options: [
      ['USD', 'USD'],
      ['EUR', 'EUR'],
      ['GBP', 'GBP'],
      ['AUD', 'AUD'],
    ],
  },
],

message2:
  'Prediction: %1',

args2: [
  {
    type: 'input_value',
    name: 'PREDICTION',
    check: 'Number',
  },
],

message3:
  'Barrier: %1',

args3: [
  {
    type: 'input_value',
    name: 'BARRIER',
    check: 'Number',
  },
],

message4:
  'Second barrier: %1',

args4: [
  {
    type: 'input_value',
    name: 'SECOND_BARRIER',
    check: 'Number',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
function (block) {
block.domToMutation =
function (xml: Element) {
const prediction =
xml.getAttribute(
'has_prediction',
)

```
    const barrier =
      xml.getAttribute(
        'has_first_barrier',
      )

    const second =
      xml.getAttribute(
        'has_second_barrier',
      )

    this.getInput(
      'PREDICTION',
    )?.setVisible(
      prediction !== 'false',
    )

    this.getInput(
      'BARRIER',
    )?.setVisible(
      barrier === 'true',
    )

    this.getInput(
      'SECOND_BARRIER',
    )?.setVisible(
      second === 'true',
    )
  }

block.mutationToDom =
  function () {
    const xml =
      Blockly.utils.xml.createElement(
        'mutation',
      )

    xml.setAttribute(
      'has_prediction',
      this.getInput(
        'PREDICTION',
      )?.isVisible()
        ? 'true'
        : 'false',
    )

    xml.setAttribute(
      'has_first_barrier',
      this.getInput(
        'BARRIER',
      )?.isVisible()
        ? 'true'
        : 'false',
    )

    xml.setAttribute(
      'has_second_barrier',
      this.getInput(
        'SECOND_BARRIER',
      )?.isVisible()
        ? 'true'
        : 'false',
    )

    return xml
  }
```

},
)

/* MULTIPLIER / ACCUMULATOR TRADE OPTIONS */

defineBlock(
'trade_definition_multiplier',
() => ({
message0:
'Multiplier: %1  Stake: %2 %3',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'MULTIPLIER_LIST',
    options: [
      ['x10', '10'],
      ['x20', '20'],
      ['x50', '50'],
      ['x100', '100'],
      ['x200', '200'],
      ['x300', '300'],
      ['x400', '400'],
      ['x500', '500'],
      ['x1000', '1000'],
    ],
  },

  {
    type: 'field_label',
    name: 'CURRENCY_LIST',
    text: 'USD',
  },

  {
    type: 'input_value',
    name: 'AMOUNT',
    check: 'Number',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'trade_definition_accumulator',
() => ({
message0:
'Growth Rate: %1  Stake: %2 %3',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'GROWTHRATE_LIST',
    options: [
      ['1%', '0.01'],
      ['2%', '0.02'],
      ['3%', '0.03'],
      ['4%', '0.04'],
      ['5%', '0.05'],
    ],
  },

  {
    type: 'field_label',
    name: 'CURRENCY_LIST',
    text: 'USD',
  },

  {
    type: 'input_value',
    name: 'AMOUNT',
    check: 'Number',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'multiplier_stop_loss',
() => ({
message0:
'Stop Loss: %1 %2',

```
args0: [
  {
    type: 'field_label',
    name: 'CURRENCY_LIST',
    text: 'USD',
  },

  {
    type: 'input_value',
    name: 'AMOUNT',
    check: 'Number',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'multiplier_take_profit',
() => ({
message0:
'Take Profit: %1 %2',

```
args0: [
  {
    type: 'field_label',
    name: 'CURRENCY_LIST',
    text: 'USD',
  },

  {
    type: 'input_value',
    name: 'AMOUNT',
    check: 'Number',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'accumulator_take_profit',
() => ({
message0:
'Take Profit: %1 %2',

```
args0: [
  {
    type: 'field_label',
    name: 'CURRENCY_LIST',
    text: 'USD',
  },

  {
    type: 'input_value',
    name: 'AMOUNT',
    check: 'Number',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

/* BEFORE PURCHASE */

defineBlock(
'before_purchase',
() => ({
message0: '%1',

```
args0: [
  {
    type: 'field_label',
    text: '2. Purchase conditions',
  },
],

message1: '%1',

args1: [
  {
    type: 'input_statement',
    name: 'BEFOREPURCHASE_STACK',
  },
],

colour:
  Colours.RootBlock.colour,
```

}),
(b) =>
b.setDeletable(false),
)

defineBlock(
'purchase',
() => ({
message0:
'Purchase %1',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'PURCHASE_LIST',
    options: purchaseMenu,
  },
],

previousStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'ask_price',
() => ({
message0: 'Ask price',
output: 'Number',
colour:
Colours.Base.colour,
}),
)

defineBlock(
'payout',
() => ({
message0: 'Payout',
output: 'Number',
colour:
Colours.Base.colour,
}),
)

/* DURING PURCHASE */

defineBlock(
'during_purchase',
() => ({
message0: '%1',

```
args0: [
  {
    type: 'field_label',
    text: '3. Sell conditions',
  },
],

message1: '%1',

args1: [
  {
    type: 'input_statement',
    name: 'DURING_PURCHASE_STACK',
  },
],

colour:
  Colours.RootBlock.colour,
```

}),
(b) =>
b.setDeletable(false),
)

defineBlock(
'check_sell',
() => ({
message0:
'Sell is available',

```
output: 'Boolean',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'sell_at_market',
() => ({
message0:
'Sell at market',

```
previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

defineBlock(
'sell_price',
() => ({
message0:
'Sell price',

```
output: 'Number',

colour:
  Colours.Base.colour,
```

}),
)

/* AFTER PURCHASE */

defineBlock(
'after_purchase',
() => ({
message0: '%1',

```
args0: [
  {
    type: 'field_label',
    text: '4. Trade results',
  },
],

message1: '%1',

args1: [
  {
    type: 'input_statement',
    name: 'AFTERPURCHASE_STACK',
  },
],

colour:
  Colours.RootBlock.colour,
```

}),
(b) =>
b.setDeletable(false),
)

defineBlock(
'contract_check_result',
() => ({
message0:
'Result is %1',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'CHECK_RESULT',
    options: [
      ['Win', 'win'],
      ['Loss', 'lose'],
    ],
  },
],

output: 'Boolean',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'read_details',
() => ({
message0:
'Details: %1',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'DETAIL_INDEX',
    options: [
      ['Deal reference', '1'],
      ['Purchase price', '2'],
      ['Payout', '3'],
      ['Profit', '4'],
      ['Contract type', '5'],
      ['Entry time', '6'],
      ['Entry spot', '7'],
      ['Exit time', '8'],
      ['Exit spot', '9'],
      ['Barrier', '10'],
      ['Result', '11'],
    ],
  },
],

output: null,

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'trade_again',
() => ({
message0:
'Trade again',

```
previousStatement: null,
nextStatement: null,

colour:
  Colours.Special1.colour,
```

}),
)

/* TICKS */

defineBlock(
'tick',
() => ({
message0:
'Last Tick',

```
output: 'Number',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'ticks',
() => ({
message0: 'Ticks',

```
output: 'Array',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'last_digit',
() => ({
message0:
'Last Digit',

```
output: 'Number',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'check_direction',
() => ({
message0:
'Direction is %1',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'CHECK_DIRECTION',
    options: [
      ['Rise', 'rise'],
      ['Fall', 'fall'],
      ['No change', ''],
    ],
  },
],

output: 'Boolean',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'stat',
() => ({
message0:
'Last digit list',

```
output: 'Array',

colour:
  Colours.Base.colour,
```

}),
)

/* INDICATORS */

function indicatorStatement(
name: string,
label: string,
) {
defineBlock(
name,
() => ({
message0:
'set %1 to ' + label,

```
  args0: [
    {
      type: 'field_variable',
      name: 'VARIABLE',
      variable: 'value',
    },
  ],

  message1: '%1',

  args1: [
    {
      type: 'input_statement',
      name: 'STATEMENT',
    },
  ],

  previousStatement: null,
  nextStatement: null,

  colour:
    Colours.Base.colour,
}),
```

)
}

indicatorStatement(
'sma_statement',
'Simple Moving Average',
)

indicatorStatement(
'ema_statement',
'Exponential Moving Average',
)

indicatorStatement(
'rsi_statement',
'Relative Strength Index',
)

indicatorStatement(
'bb_statement',
'Bollinger Bands',
)

function indicatorOutput(
name: string,
label: string,
) {
defineBlock(
name,
() => ({
message0: label,
output: 'Number',
colour:
Colours.Base.colour,
}),
)
}

indicatorOutput(
'smaa_statement',
'SMA Array',
)

indicatorOutput(
'emaa_statement',
'EMA Array',
)

indicatorOutput(
'rsia_statement',
'RSI Array',
)

indicatorOutput(
'bba_statement',
'Bollinger Bands Array',
)

indicatorOutput(
'macda_statement',
'MACD Array',
)

/* MISC */

defineBlock(
'balance',
() => ({
message0:
'Balance %1',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'BALANCE_TYPE',
    options: [
      ['String', 'STR'],
      ['Number', 'NUM'],
    ],
  },
],

output: null,

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'notify',
() => ({
message0:
'Notify %1 sound %2 message %3',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'NOTIFICATION_TYPE',
    options: [
      ['Green', 'success'],
      ['Blue', 'info'],
      ['Yellow', 'warn'],
      ['Red', 'error'],
    ],
  },

  {
    type: 'field_checkbox',
    name: 'NOTIFICATION_SOUND',
    checked: true,
  },

  {
    type: 'input_value',
    name: 'MESSAGE',
    check: 'String',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'console',
() => ({
message0:
'Print %1 %2',

```
args0: [
  {
    type: 'field_dropdown',
    name: 'CONSOLE_TYPE',
    options: [
      ['Log', 'log'],
      ['Warn', 'warn'],
      ['Error', 'error'],
      ['Table', 'table'],
    ],
  },

  {
    type: 'input_value',
    name: 'MESSAGE',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'total_profit',
() => ({
message0:
'Total Profit',

```
output: 'Number',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'total_runs',
() => ({
message0:
'Total Runs',

```
output: 'Number',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'block_holder',
() => ({
message0: '',

```
previousStatement: null,
nextStatement: null,

colour:
  Colours.Special4.colour,
```

}),
)

defineBlock(
'set_stake',
() => ({
message0:
'Set stake to %1',

```
args0: [
  {
    type: 'input_value',
    name: 'STAKE',
    check: 'Number',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'get_stake',
() => ({
message0:
'Current stake',

```
output: 'Number',

colour:
  Colours.Base.colour,
```

}),
)

/* TIME */

defineBlock(
'epoch',
() => ({
message0:
'Seconds Since Epoch',

```
output: 'Number',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'timeout',
() => ({
message0: '%1',

```
args0: [
  {
    type: 'input_statement',
    name: 'TIMEOUTSTACK',
  },
],

message1:
  'Run after %1 seconds',

args1: [
  {
    type: 'input_value',
    name: 'SECONDS',
    check: 'Number',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'tick_delay',
() => ({
message0: '%1',

```
args0: [
  {
    type: 'input_statement',
    name: 'TICKDELAYSTACK',
  },
],

message1:
  'Run after %1 ticks',

args1: [
  {
    type: 'input_value',
    name: 'TICKDELAYVALUE',
    check: 'Number',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'todatetime',
() => ({
message0:
'Convert to date %1',

```
args0: [
  {
    type: 'input_value',
    name: 'TIMESTAMP',
    check: 'Number',
  },
],

output: 'String',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'totimestamp',
() => ({
message0:
'Convert to timestamp %1',

```
args0: [
  {
    type: 'input_value',
    name: 'DATETIME',
    check: 'String',
  },
],

output: 'Number',

colour:
  Colours.Base.colour,
```

}),
)

/* CANDLE */

defineBlock(
'is_candle_black',
() => ({
message0:
'Candle is black',

```
output: 'Boolean',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'ohlc_values_in_list',
() => ({
message0:
'OHLC values in list',

```
output: 'Array',

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'read_ohlc_obj',
() => ({
message0:
'Read OHLC object',

```
output: null,

colour:
  Colours.Base.colour,
```

}),
)

/* MODERN DERIV TEXT JOIN */

defineBlock(
'text_join',
() => ({
message0:
'create text',

```
output: 'String',

colour:
  Colours.Base.colour,
```

}),
function (block) {
const rebuild = (
count: number,
) => {
while (
block.inputList.length
) {
block.removeInput(
block.inputList[0].name,
)
}

```
  block
    .appendDummyInput()
    .appendField(
      'create text',
    )

  for (
    let i = 0;
    i < count;
    i++
  ) {
    block
      .appendValueInput(
        'ADD' + i,
      )
      .appendField(
        i === 0
          ? ''
          : '+',
      )
  }
}

rebuild(2)

block.domToMutation =
  function (xml: Element) {
    const count =
      Math.max(
        1,
        Number(
          xml.getAttribute(
            'items',
          ) || 2,
        ),
      )

    rebuild(count)
  }

block.mutationToDom =
  function () {
    const xml =
      Blockly.utils.xml.createElement(
        'mutation',
      )

    const count =
      block.inputList.filter(
        (i) =>
          i.name.startsWith(
            'ADD',
          ),
      ).length

    xml.setAttribute(
      'items',
      String(count),
    )

    return xml
  }
```

},
)

/* LEGACY DERIV TEXT JOIN */

defineBlock(
'text_join_legacy',
() => ({
message0:
'create text',

```
args0: [
  {
    type: 'field_variable',
    name: 'VARIABLE',
    variable: 'text',
  },
],

message1: '%1',

args1: [
  {
    type: 'input_statement',
    name: 'STACK',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Base.colour,
```

}),
)

defineBlock(
'text_statement',
() => ({
message0: '%1',

```
args0: [
  {
    type: 'input_value',
    name: 'TEXT',
  },
],

previousStatement: null,
nextStatement: null,

colour:
  Colours.Base.colour,
```

}),
)

/* =========================================================
BOT API / GENERATORS
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
