/*
# Create quick_strategies table

1. New Tables
- `quick_strategies` — stores one-click trading strategies with predefined parameters.
  - `id` (uuid, primary key)
  - `deriv_account_id` (text, not null) — owner's Deriv account
  - `name` (text, not null)
  - `symbol` (text, not null) — e.g. "R_10"
  - `contract_type` (text, not null, default 'CALL') — CALL or PUT
  - `stake` (numeric, not null, default 1)
  - `duration` (integer, not null, default 5)
  - `duration_unit` (text, not null, default 'm') — t, s, m, h
  - `martingale_steps` (integer, not null, default 0)
  - `martingale_multiplier` (numeric, not null, default 2)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `quick_strategies`.
- Same rationale as trades and bots: no Supabase sign-in, anon-key frontend.
  Data is intentionally shared. USING (true) is intentional.
- 4 policies: select, insert, update, delete — all `TO anon, authenticated`.

3. Important Notes
- The Dashboard page reads strategies filtered by deriv_account_id.
- contract_type has a CHECK constraint limiting to CALL or PUT.
*/

CREATE TABLE IF NOT EXISTS quick_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deriv_account_id text NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  contract_type text NOT NULL DEFAULT 'CALL' CHECK (contract_type IN ('CALL', 'PUT')),
  stake numeric NOT NULL DEFAULT 1,
  duration integer NOT NULL DEFAULT 5,
  duration_unit text NOT NULL DEFAULT 'm',
  martingale_steps integer NOT NULL DEFAULT 0,
  martingale_multiplier numeric NOT NULL DEFAULT 2,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quick_strategies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_strategies" ON quick_strategies;
CREATE POLICY "anon_select_strategies" ON quick_strategies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_strategies" ON quick_strategies;
CREATE POLICY "anon_insert_strategies" ON quick_strategies FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_strategies" ON quick_strategies;
CREATE POLICY "anon_update_strategies" ON quick_strategies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_strategies" ON quick_strategies;
CREATE POLICY "anon_delete_strategies" ON quick_strategies FOR DELETE
  TO anon, authenticated USING (true);
