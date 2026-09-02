import * as Blockly from 'blockly'
import { javascriptGenerator } from 'blockly/javascript'

function unsupportedValue(
block: Blockly.Block,
): string {
return [
'(function(){throw new Error(',
JSON.stringify(
'Unsupported Blockly value block: ' +
block.type +
'. This block is not implemented in this bot engine.',
),
')})()',
].join('')
}

function getFieldValue(
block: Blockly.Block,
names: string[],
): string {
for (const name of names) {
const value =
block.getFieldValue(name)

```
if (
  value !== undefined &&
  value !== null &&
  String(value) !== ''
) {
  return String(value)
}
```

}

return ''
}

function valueCode(
block: Blockly.Block,
names: string[],
fallback = '',
): string {
for (const name of names) {
const code =
javascriptGenerator.valueToCode(
block,
name,
javascriptGenerator.ORDER_NONE,
)

```
if (
  code &&
  code.trim()
) {
  return code
}
```

}

return fallback
}

/* =========================================================
STATEMENT GENERATION
========================================================= */

function generateStatementChain(
first: Blockly.Block | null,
): string {
const output: string[] = []

let current = first

while (current) {
const generated =
javascriptGenerator.blockToCode(
current,
)

```
if (
  typeof generated ===
  'string'
) {
  if (
    generated.trim()
  ) {
    output.push(
      generated,
    )
  }
} else if (
  Array.isArray(generated)
) {
  const code =
    generated[0]

  if (
    typeof code ===
    'string' &&
    code.trim()
  ) {
    output.push(code)
  }
}

current =
  current.getNextBlock()
```

}

return output.join('\n')
}

function getFirstStatementInputName(
block: Blockly.Block,
): string | null {
for (
const input of
block.inputList
) {
if (
input.type ===
Blockly.inputs
.inputTypes
.STATEMENT
) {
return input.name
}
}

return null
}

function generateBlockStatement(
block: Blockly.Block,
): string {
const inputName =
getFirstStatementInputName(
block,
)

if (!inputName) {
return ''
}

const first =
block.getInputTargetBlock(
inputName,
)

return generateStatementChain(
first,
)
}

function findWorkspaceBlock(
workspace: Blockly.Workspace,
type: string,
): Blockly.Block | null {
return (
workspace
.getAllBlocks(false)
.find(
(block) =>
block.type === type,
) || null
)
}

/* =========================================================
ROOT / CONFIGURATION
========================================================= */

function registerEmpty(
type: string,
): void {
javascriptGenerator.forBlock[type] =
function (): string {
return ''
}
}

registerEmpty(
'trade_definition',
)

registerEmpty(
'trade_definition_market',
)

registerEmpty(
'trade_definition_tradetype',
)

registerEmpty(
'trade_definition_contracttype',
)

registerEmpty(
'trade_definition_candleinterval',
)

registerEmpty(
'trade_definition_restartbuysell',
)

registerEmpty(
'trade_definition_restartonerror',
)

registerEmpty(
'trade_definition_tradeoptions',
)

registerEmpty(
'trade_definition_multiplier',
)

registerEmpty(
'trade_definition_accumulator',
)

registerEmpty(
'multiplier_stop_loss',
)

registerEmpty(
'multiplier_take_profit',
)

registerEmpty(
'accumulator_take_profit',
)

/* =========================================================
PURCHASE
========================================================= */

javascriptGenerator.forBlock[
'purchase'
] = function (
block: Blockly.Block,
): string {
const contractType =
getFieldValue(
block,
[
'PURCHASE_LIST',
'CONTRACT_TYPE',
'TYPE_LIST',
],
)

if (!contractType) {
return [
'throw new Error(',
JSON.stringify(
'Purchase block has no contract type.',
),
');',
].join('')
}

return (
'await Bot.purchase(' +
JSON.stringify(
contractType,
) +
');'
)
}

/* =========================================================
TRADE EXECUTION
========================================================= */

javascriptGenerator.forBlock[
'sell_at_market'
] = function (): string {
return 'await Bot.sellAtMarket();'
}

javascriptGenerator.forBlock[
'is_contract_open'
] = function (): [
string,
number,
] {
return [
'Bot.isContractOpen()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'is_sell_available'
] = function (): [
string,
number,
] {
return [
'Bot.isSellAvailable()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'ask_price'
] = function (): [
string,
number,
] {
return [
'Bot.getAskPrice()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'payout'
] = function (): [
string,
number,
] {
return [
'Bot.getPayout()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'sell_price'
] = function (): [
string,
number,
] {
return [
'Bot.getSellPrice()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'trade_again'
] = function (): string {
return 'await Bot.purchase();'
}

/* =========================================================
TICKS
========================================================= */

javascriptGenerator.forBlock[
'tick'
] = function (): [
string,
number,
] {
return [
'Bot.getTick()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'ticks'
] = function (): [
string,
number,
] {
return [
'Bot.getTicks()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'last_digit'
] = function (): [
string,
number,
] {
return [
'Bot.getLastDigit()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'last_digit_list'
] = function (): [
string,
number,
] {
return [
'Bot.getLastDigitList()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'check_direction'
] = function (
block: Blockly.Block,
): [
string,
number,
] {
const direction =
getFieldValue(
block,
['CHECK_DIRECTION'],
)

if (
direction === 'rise'
) {
return [
'Bot.getDirection() === "up"',
javascriptGenerator.ORDER_EQUALITY,
]
}

if (
direction === 'fall'
) {
return [
'Bot.getDirection() === "down"',
javascriptGenerator.ORDER_EQUALITY,
]
}

return [
'Bot.getDirection() === "same"',
javascriptGenerator.ORDER_EQUALITY,
]
}

javascriptGenerator.forBlock[
'check_sell'
] = function (): [
string,
number,
] {
return [
'Bot.isSellAvailable()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

/* =========================================================
CONTRACT RESULT
========================================================= */

javascriptGenerator.forBlock[
'contract_check_result'
] = function (
block: Blockly.Block,
): [
string,
number,
] {
const field =
getFieldValue(
block,
[
'CHECK_RESULT',
'RESULT',
],
) || 'win'

const normalized =
field.toLowerCase() ===
'loss'
? 'loss'
: field.toLowerCase() ===
'lose'
? 'loss'
: field.toLowerCase()

return [
'Bot.getLastResult() === ' +
JSON.stringify(
normalized,
),
javascriptGenerator.ORDER_EQUALITY,
]
}

javascriptGenerator.forBlock[
'read_details'
] = function (
block: Blockly.Block,
): [
string,
number,
] {
const detail =
getFieldValue(
block,
[
'DETAIL_INDEX',
'DETAIL',
],
)

return [
'Bot.getDetails(' +
JSON.stringify(detail) +
')',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

/* =========================================================
STATISTICS
========================================================= */

javascriptGenerator.forBlock[
'stat'
] = function (): [
string,
number,
] {
return [
'Bot.getLastDigitList()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'total_profit'
] = function (): [
string,
number,
] {
return [
'Bot.getTotalProfit()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'total_runs'
] = function (): [
string,
number,
] {
return [
'Bot.getTotalRuns()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

/* =========================================================
STAKE
========================================================= */

javascriptGenerator.forBlock[
'set_stake'
] = function (
block: Blockly.Block,
): string {
const amount =
valueCode(
block,
[
'STAKE',
'AMOUNT',
],
'0',
)

return (
'Bot.setStake(Number(' +
amount +
'));'
)
}

javascriptGenerator.forBlock[
'get_stake'
] = function (): [
string,
number,
] {
return [
'Bot.getStake()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

/* =========================================================
BARRIER
========================================================= */

javascriptGenerator.forBlock[
'set_barrier'
] = function (
block: Blockly.Block,
): string {
const value =
valueCode(
block,
['BARRIER'],
'',
)

const barrier =
value ||
JSON.stringify(
getFieldValue(
block,
[
'BARRIER',
'PREDICTION',
],
),
)

return (
'Bot.setBarrier(' +
barrier +
');'
)
}

javascriptGenerator.forBlock[
'get_barrier'
] = function (): [
string,
number,
] {
return [
'Bot.getBarrier()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

/* =========================================================
ACCOUNT
========================================================= */

javascriptGenerator.forBlock[
'balance'
] = function (): [
string,
number,
] {
return [
'Bot.getBalance()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

/* =========================================================
NOTIFICATIONS
========================================================= */

javascriptGenerator.forBlock[
'notify'
] = function (
block: Blockly.Block,
): string {
const type =
getFieldValue(
block,
[
'NOTIFICATION_TYPE',
'TYPE',
],
) || 'info'

const message =
valueCode(
block,
['MESSAGE'],
JSON.stringify(
getFieldValue(
block,
[
'MESSAGE',
'TEXT',
],
),
),
)

return (
'Bot.notify(' +
JSON.stringify(type) +
', String(' +
message +
'));'
)
}

javascriptGenerator.forBlock[
'console'
] = function (
block: Blockly.Block,
): string {
const type =
getFieldValue(
block,
[
'CONSOLE_TYPE',
'TYPE',
'LEVEL',
],
) || 'log'

const message =
valueCode(
block,
['MESSAGE'],
JSON.stringify(
getFieldValue(
block,
[
'MESSAGE',
'TEXT',
],
),
),
)

return (
'Bot.console(' +
JSON.stringify(type) +
', ' +
message +
');'
)
}

/* =========================================================
TIMING
========================================================= */

javascriptGenerator.forBlock[
'sleep'
] = function (
block: Blockly.Block,
): string {
const ms =
valueCode(
block,
['MS'],
'1000',
)

return (
'await Bot.sleep(Number(' +
ms +
'));'
)
}

javascriptGenerator.forBlock[
'tick_delay'
] = function (
block: Blockly.Block,
): string {
const count =
valueCode(
block,
[
'TICKS',
'COUNT',
'TICKDELAYVALUE',
],
'1',
)

return (
'await Bot.tickDelay(Number(' +
count +
'));'
)
}

/* =========================================================
TIME HELPERS
========================================================= */

javascriptGenerator.forBlock[
'epoch'
] = function (): [
string,
number,
] {
return [
'Math.floor(Date.now() / 1000)',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'timeout'
] = function (
block: Blockly.Block,
): string {
const duration =
valueCode(
block,
['SECONDS'],
'1',
)

const code =
javascriptGenerator.statementToCode(
block,
'TIMEOUTSTACK',
)

return [
'await Bot.sleep(Number(',
duration,
') * 1000);',
code,
].join('')
}

javascriptGenerator.forBlock[
'todatetime'
] = function (
block: Blockly.Block,
): [
string,
number,
] {
const value =
valueCode(
block,
[
'TIMESTAMP',
'VALUE',
],
'Date.now() / 1000',
)

return [
'new Date(Number(' +
value +
') * 1000).toLocaleString()',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

javascriptGenerator.forBlock[
'totimestamp'
] = function (
block: Blockly.Block,
): [
string,
number,
] {
const value =
valueCode(
block,
[
'DATETIME',
'VALUE',
],
'Date.now()',
)

return [
'Math.floor(new Date(' +
value +
').getTime() / 1000)',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

/* =========================================================
MODERN TEXT JOIN
========================================================= */

javascriptGenerator.forBlock[
'text_join'
] = function (
block: Blockly.Block,
): [
string,
number,
] {
const parts: string[] = []

for (
const input of
block.inputList
) {
if (
!input.name.startsWith(
'ADD',
)
) {
continue
}

```
const code =
  javascriptGenerator.valueToCode(
    block,
    input.name,
    javascriptGenerator.ORDER_NONE,
  ) ||
  JSON.stringify('')

parts.push(code)
```

}

return [
'[' +
parts.join(', ') +
'].join("")',
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}

/* =========================================================
LEGACY TEXT JOIN
========================================================= */

javascriptGenerator.forBlock[
'text_join_legacy'
] = function (
block: Blockly.Block,
): string {
const variableField =
block.getField(
'VARIABLE',
)

if (!variableField) {
return ''
}

const variableId =
variableField.getValue()

if (!variableId) {
return ''
}

const variableName =
javascriptGenerator.getVariableName(
variableId,
)

const parts: string[] = []

let current =
block.getInputTargetBlock(
'STACK',
)

while (current) {
if (
current.type ===
'text_statement'
) {
const value =
valueCode(
current,
['TEXT'],
JSON.stringify(''),
)

```
  parts.push(
    'String(' +
      value +
      ')',
  )
} else {
  const generated =
    javascriptGenerator.blockToCode(
      current,
    )

  if (
    typeof generated ===
    'string' &&
    generated.trim()
  ) {
    parts.push(
      'String(' +
        JSON.stringify(
          generated,
        ) +
        ')',
    )
  }
}

current =
  current.getNextBlock()
```

}

return (
variableName +
' = [' +
parts.join(', ') +
'].join("");'
)
}

javascriptGenerator.forBlock[
'text_statement'
] = function (
block: Blockly.Block,
): string {
const text =
valueCode(
block,
['TEXT'],
JSON.stringify(
getFieldValue(
block,
['TEXT'],
),
),
)

return (
'String(' +
text +
');'
)
}

/* =========================================================
CONTAINERS
========================================================= */

javascriptGenerator.forBlock[
'block_holder'
] = function (
block: Blockly.Block,
): string {
return (
javascriptGenerator.statementToCode(
block,
'DO',
)
)
}

/* =========================================================
KNOWN UNSUPPORTED VALUE BLOCKS
========================================================= */

const unsupportedTypes = [
'sma',
'ema',
'bollinger',
'rsi',
'macd',
'stochastic',
'ichimoku',
'awesome_oscillator',
'wma',
'williams_r',
'candle',
'candle_open',
'candle_close',
'candle_high',
'candle_low',
'candle_color',
'ohlc',
'indicator',
]

for (
const type of
unsupportedTypes
) {
javascriptGenerator.forBlock[
type
] =
function (
block: Blockly.Block,
): [
string,
number,
] {
return [
unsupportedValue(block),
javascriptGenerator.ORDER_FUNCTION_CALL,
]
}
}

/* =========================================================
MAIN BOT GENERATOR
========================================================= */

export function generateBotCode(
workspace: Blockly.Workspace,
): string {
/*

* CRITICAL:
*
* Blockly requires the JavaScript generator
* to be initialized before blockToCode/valueToCode
* are called. This was the source of:
*
* "CodeGenerator init was not called before
* blockToCode was called."
  */
  javascriptGenerator.init(
  workspace,
  )

try {
const tradeDefinition =
findWorkspaceBlock(
workspace,
'trade_definition',
)

```
const before =
  findWorkspaceBlock(
    workspace,
    'before_purchase',
  )

const during =
  findWorkspaceBlock(
    workspace,
    'during_purchase',
  )

const after =
  findWorkspaceBlock(
    workspace,
    'after_purchase',
  )

const sections: string[] =
  []

sections.push(
  'async function runBot() {',
)

sections.push(
  '  Bot.notify("info", "Bot started");',
)

if (
  tradeDefinition
) {
  sections.push(
    '  // Trade definition loaded from Blockly workspace',
  )
}

if (before) {
  const code =
    generateBlockStatement(
      before,
    )

  if (
    code.trim()
  ) {
    sections.push(
      '  // Before purchase',
    )

    sections.push(
      code
        .split('\n')
        .map(
          (line) =>
            '  ' +
            line,
        )
        .join('\n'),
    )
  }
}

if (during) {
  const code =
    generateBlockStatement(
      during,
    )

  if (
    code.trim()
  ) {
    sections.push(
      '  // During purchase',
    )

    sections.push(
      code
        .split('\n')
        .map(
          (line) =>
            '  ' +
            line,
        )
        .join('\n'),
    )
  }
}

if (after) {
  const code =
    generateBlockStatement(
      after,
    )

  if (
    code.trim()
  ) {
    sections.push(
      '  // After purchase',
    )

    sections.push(
      code
        .split('\n')
        .map(
          (line) =>
            '  ' +
            line,
        )
        .join('\n'),
    )
  }
}

sections.push(
  '  Bot.notify("success", "Bot finished");',
)

sections.push('}')

sections.push('')

sections.push(
  'return runBot();',
)

return sections.join('\n')
```

} finally {
javascriptGenerator.finish('')
}
}

export default javascriptGenerator
