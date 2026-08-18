/*
# Create trades table (single-tenant, no Supabase auth)

1. New Tables
- `trades` — stores a record of every trade executed through the DerivMarkets platform.
  - `id` (uuid, primary key)
  - `deriv_account_id` (text, not null) — the user's Deriv loginid (e.g. CR12345)
  - `contract_id` (bigint) — Deriv contract ID
  - `symbol` (text, not null) — traded symbol (e.g. R_100)
  - `display_name` (text) — human-readable market name
  - `contract_type` (text, not null) — CALL or PUT
  - `stake` (numeric(18,2), not null) — stake amount
  - `payout` (numeric(18,2)) — payout amount
  - `profit` (numeric(18,2)) — profit or loss
  - `status` (text, not null, default 'open') — open, won, lost, sold
  - `purchase_price` (numeric(18,2)) — purchase price
  - `sell_price` (numeric(18,2)) — sell price
  - `purchase_time` (timestamptz) — when the contract was bought
  - `sell_time` (timestamptz) — when the contract was sold/expired
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `trades`.
- Allow anon + authenticated CRUD because the app uses Deriv OAuth (not Supabase auth).
  Data is scoped by `deriv_account_id` in application logic, not by Supabase RLS,
  since there is no Supabase sign-in screen.
*/

CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deriv_account_id text NOT NULL,
  contract_id bigint,
  symbol text NOT NULL,
  display_name text,
  contract_type text NOT NULL,
  stake numeric(18,2) NOT NULL,
  payout numeric(18,2),
  profit numeric(18,2),
  status text NOT NULL DEFAULT 'open',
  purchase_price numeric(18,2),
  sell_price numeric(18,2),
  purchase_time timestamptz,
  sell_time timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_trades" ON trades;
CREATE POLICY "anon_select_trades" ON trades FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_trades" ON trades;
CREATE POLICY "anon_insert_trades" ON trades FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_trades" ON trades;
CREATE POLICY "anon_update_trades" ON trades FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_trades" ON trades;
CREATE POLICY "anon_delete_trades" ON trades FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_trades_deriv_account_id ON trades(deriv_account_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
