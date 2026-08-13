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
}

export interface SymbolInfo {
  symbol: string;
  display_name: string;
  market: string;
  market_display_name: string;
  submarket: string;
  submarket_display_name: string;
  pip: number;
  exchange_is_open: number;
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
  sell_price?: number;
  payout: number;
  profit: number;
  purchase_time: number;
  sell_time?: number;
  is_sold: boolean;
  is_expired: boolean;
  longcode: string;
  current_spot: number;
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
