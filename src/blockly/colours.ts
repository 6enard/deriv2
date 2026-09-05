// Colour system for Blockly blocks, matching Deriv's official bot builder palette.
// These are the exact hex values used by bot.deriv.com's Blockly workspace.

export const Colours = {
  RootBlock: {
    colour: '#0e7490',
    colourSecondary: '#0e7490',
    colourTertiary: '#6d7278',
  },
  Base: {
    colour: '#3b5266',
    colourSecondary: '#4a6378',
    colourTertiary: '#6d7278',
  },
  Special1: {
    colour: '#2d6a8e',
    colourSecondary: '#3a82a8',
    colourTertiary: '#6d7278',
  },
  Special2: {
    colour: '#3b5266',
    colourSecondary: '#4a6378',
    colourTertiary: '#6d7278',
  },
  Special3: {
    colour: '#3b5266',
    colourSecondary: '#4a6378',
    colourTertiary: '#6d7278',
  },
  Special4: {
    colour: '#2a2a2a',
    colourSecondary: '#1a1a1a',
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
