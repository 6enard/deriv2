export interface DerivAccount {
  loginid: string
  currency: string
  balance: number
  is_virtual: boolean
  fullname: string
  email: string
}

export interface DerivSessionAccount extends DerivAccount {
  token: string
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
