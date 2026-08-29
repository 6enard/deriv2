/*
# Create trades table

1. New Tables
- `trades` — stores a record of every trade placed through the app.
  - `id` (uuid, primary key)
  - `deriv_account_id` (text, not null) — the Deriv account that placed the trade
  - `contract_id` (bigint, nullable) — Deriv's contract identifier
  - `symbol` (text, not null) — e.g. "R_10"
  - `display_name` (text, nullable) — human-readable market name
  - `contract_type` (text, not null) — CALL, PUT, etc.
  - `stake` (numeric, not null) — amount staked
  - `payout` (numeric, nullable) — payout amount
  - `profit` (numeric, nullable) — profit/loss
  - `status` (text, not null, default 'open') — open, won, lost, sold
  - `purchase_price` (numeric, nullable)
  - `sell_price` (numeric, nullable)
  - `purchase_time` (timestamptz, nullable)
  - `sell_time` (timestamptz, nullable)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `trades`.
- This app has no Supabase sign-in screen — it authenticates via Deriv OAuth.
  The browser talks to Supabase with the anon key, so policies must allow
  the `anon` role. Ownership is scoped by `deriv_account_id`, which the
  frontend always passes. Since there is no server-side enforcement of
  which Deriv account a user owns (the token lives in the browser), the
  data is effectively shared/public — `USING (true)` is intentional here.
- 4 policies: select, insert, update, delete — all `TO anon, authenticated`.

3. Important Notes
- The app stores trades via the OpenContractsContext when contracts settle.
- No foreign keys (deriv_account_id is not a Supabase auth user).
*/

CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deriv_account_id text NOT NULL,
  contract_id bigint,
  symbol text NOT NULL,
  display_name text,
  contract_type text NOT NULL,
  stake numeric NOT NULL,
  payout numeric,
  profit numeric,
  status text NOT NULL DEFAULT 'open',
  purchase_price numeric,
  sell_price numeric,
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
