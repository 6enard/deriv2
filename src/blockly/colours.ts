// Colour system ported from deriv-com/bot's scratch/hooks/colours.js
// and the block definitions that reference Blockly.Colours.* / Blockly.Categories.*

export const Colours = {
  RootBlock: {
    colour: '#064e72',
    colourSecondary: '#064e72',
    colourTertiary: '#6d7278',
  },
  Base: {
    colour: '#e5e5e5',
    colourSecondary: '#ffffff',
    colourTertiary: '#6d7278',
  },
  Special1: {
    colour: '#e5e5e5',
    colourSecondary: '#ffffff',
    colourTertiary: '#6d7278',
  },
  Special2: {
    colour: '#e5e5e5',
    colourSecondary: '#ffffff',
    colourTertiary: '#6d7278',
  },
  Special3: {
    colour: '#e5e5e5',
    colourSecondary: '#ffffff',
    colourTertiary: '#6d7278',
  },
  Special4: {
    colour: '#e5e5e5',
    colourSecondary: '#000000',
    colourTertiary: '#0e0e0e',
  },
}

// Category identifiers matching deriv-com/bot's scratch/hooks/constant.js
export const Categories = {
  Trade_Definition: 'trade_parameters',
  Before_Purchase: 'purchase_conditions',
  During_Purchase: 'sell_conditions',
  After_Purchase: 'trade_results',
  Mathematical: 'math',
  Logic: 'logic',
  Text: 'text',
  Variables: 'variables',
  Functions: 'custom_functions',
  List: 'lists',
  Indicators: 'indicators',
  Time: 'time',
  Tick_Analysis: 'technical_analysis',
  Candle: 'candle',
  Miscellaneous: 'miscellaneous',
  Loop: 'loops',
} as const

// Dark-theme colour overrides for the Blockly workspace chrome
// (flyout, toolbox, grid, scrollbar). Block colours stay as defined above.
export const darkThemeOverrides = {
  toolboxBackground: '#141414',
  flyoutBackground: '#1f1f1f',
  flyoutOpacity: 1,
  scrollbarColour: '#333333',
  insertionMarkerColour: '#e53935',
  insertionMarkerOpacity: 0.4,
  cursorColour: '#e53935',
  gridColour: '#262626',
}
