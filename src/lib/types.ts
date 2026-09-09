export interface DerivAccount {
  account_id: string
  currency: string
  balance: number
  account_type: string
}

export interface DerivSessionAccount extends DerivAccount {
  access_token: string
  token_expiry: number
  ws_url?: string
  refresh_token?: string
  source_balance?: number
  source_currency?: string
}

export interface SymbolInfo {
  symbol: string;
  display_name: string;
  market: string;
  market_display_name: string;
  submarket: string;
  pip_size: number;
  exchange_is_open: number;
}

export function mapActiveSymbol(s: any): SymbolInfo {
  const market = s.market
  const marketDisplay = s.market_display_name ?? market
    .split('_')
    .filter(Boolean)
    .map((w: string) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
  return {
    symbol: s.underlying_symbol ?? s.symbol,
    display_name: s.underlying_symbol_name ?? s.display_name,
    market,
    market_display_name: marketDisplay,
    submarket: s.submarket,
    pip_size: s.pip_size ?? s.pip ?? 2,
    exchange_is_open: s.exchange_is_open,
  }
}

export interface Tick {
  symbol: string;
  quote: number;
  epoch: number;
  pip_size: number;
}

export interface Proposal {
  id: string;
  ask_price: number;
  payout: number;
  spot: number;
}

export interface OpenContract {
  contract_id: number;
  symbol: string;
  display_name: string;
  contract_type: string;
  status: string;
  buy_price: number;
  sell_price: number | null;
  payout: number;
  profit: number;
  purchase_time: number;
  sell_time?: number;
  is_sold: boolean;
  is_expired: boolean;
  longcode: string;
  current_spot: number;
  entry_spot: number | null;
  exit_spot: number | null;
  tick_count: number;
  barrier: string | null;
  duration: number | null;
  duration_unit: string | null;
}
const SYMBOL_DISPLAY_NAMES: Record<string, string> = {
  '1HZ10V': 'Volatility 10 (1s) Index',
  '1HZ15V': 'Volatility 15 (1s) Index',
  '1HZ20V': 'Volatility 20 (1s) Index',
  '1HZ25V': 'Volatility 25 (1s) Index',
  '1HZ50V': 'Volatility 50 (1s) Index',
  '1HZ75V': 'Volatility 75 (1s) Index',
  '1HZ100V': 'Volatility 100 (1s) Index',
  R_10: 'Volatility 10 Index',
  R_15: 'Volatility 15 Index',
  R_25: 'Volatility 25 Index',
  R_50: 'Volatility 50 Index',
  R_75: 'Volatility 75 Index',
  R_100: 'Volatility 100 Index',
  BOOM500: 'Boom 500 Index',
  BOOM1000: 'Boom 1000 Index',
  CRASH500: 'Crash 500 Index',
  CRASH1000: 'Crash 1000 Index',
  JUMP10: 'Jump 10 Index',
  JUMP25: 'Jump 25 Index',
  JUMP50: 'Jump 50 Index',
  JUMP75: 'Jump 75 Index',
  JUMP100: 'Jump 100 Index',
  STEP: 'Step Index',
  stpRNG: 'Step Index',
  '10D': 'Drift Volatility 10 Index',
  '25D': 'Drift Volatility 25 Index',
  '50D': 'Drift Volatility 50 Index',
  '75D': 'Drift Volatility 75 Index',
  '100D': 'Drift Volatility 100 Index',
  BOOM300N: 'Boom 300 Index',
  CRASH300N: 'Crash 300 Index',
}

function isRawSymbolId(value: string): boolean {
  return /^[0-9A-Z_]{3,20}$/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)
}

export function resolveDisplayName(name: string | undefined, symbol: string | undefined): string {
  if (name && name.trim() && !isRawSymbolId(name)) return name
  if (symbol) {
    const mapped = SYMBOL_DISPLAY_NAMES[symbol]
    if (mapped) return mapped
    if (!isRawSymbolId(symbol)) return symbol
  }
  if (name && name.trim()) return name
  return symbol || '—'
}

export function mapOpenContract(raw: any): OpenContract {
  const symbol = raw.underlying_symbol ?? raw.symbol ?? ''
  const rawDisplay = raw.display_name ?? ''
  return {
    contract_id: raw.contract_id,
    symbol,
    display_name: resolveDisplayName(rawDisplay, symbol),
    contract_type: raw.contract_type ?? '',
    status: raw.status ?? '',
    buy_price: parseFloat(raw.buy_price ?? '0'),
    sell_price: raw.sell_price != null ? parseFloat(raw.sell_price) : null,
    payout: parseFloat(raw.payout ?? '0'),
    profit: parseFloat(raw.profit ?? '0'),
    purchase_time: raw.purchase_time ?? 0,
    sell_time: raw.sell_time,
    is_sold: Boolean(raw.is_sold),
    is_expired: Boolean(raw.is_expired),
    longcode: raw.longcode ?? '',
    current_spot: parseFloat(raw.current_spot ?? '0'),
    entry_spot: raw.entry_spot != null ? parseFloat(raw.entry_spot) : null,
    exit_spot: raw.exit_spot != null ? parseFloat(raw.exit_spot) : null,
    tick_count: raw.tick_count ?? 0,
    barrier: raw.barrier ?? null,
    duration: raw.duration ?? null,
    duration_unit: raw.duration_unit ?? null,
  };
}

export interface TradeRecord {
  id?: string;
  deriv_account_id: string;
  contract_id?: number;
  symbol: string;
  display_name?: string;
  contract_type: string;
  stake: number;
  payout?: number;
  profit?: number;
  status: string;
  purchase_price?: number;
  sell_price?: number;
  purchase_time?: string;
  sell_time?: string;
  created_at?: string;
}

export type StrategyType = 'martingale' | 'grid' | 'trend_follow' | 'mean_reversion' | 'custom';

export interface Bot {
  id: string;
  deriv_account_id: string;
  name: string;
  description: string;
  strategy_type: StrategyType;
  config: Record<string, unknown>;
  is_free: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickStrategy {
  id?: string;
  deriv_account_id: string;
  name: string;
  symbol: string;
  contract_type: 'CALL' | 'PUT';
  stake: number;
  duration: number;
  duration_unit: string;
  martingale_steps: number;
  martingale_multiplier: number;
  created_at?: string;
}
