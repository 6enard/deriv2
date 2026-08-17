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
  refresh_token?: string
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
  return {
    symbol: s.underlying_symbol ?? s.symbol,
    display_name: s.underlying_symbol_name ?? s.display_name,
    market: s.market,
    market_display_name: s.market_display_name ?? s.market
      .split('_')
      .map((w: string) => w[0].toUpperCase() + w.slice(1))
      .join(' '),
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
}
export function mapOpenContract(raw: any): OpenContract {
  return {
    contract_id: raw.contract_id,
    symbol: raw.underlying_symbol ?? raw.symbol ?? '',
    display_name: raw.underlying_symbol ?? raw.display_name ?? raw.symbol ?? '',
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
  };
}


export function mapOpenContract(raw: any): OpenContract {
  return {
    contract_id: raw.contract_id,
    symbol: raw.underlying_symbol ?? raw.symbol ?? '',
    display_name: raw.underlying_symbol ?? raw.display_name ?? raw.symbol ?? '',
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
