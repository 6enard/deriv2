/*
# Create trading bots tables

1. New Tables
- `bots` — stores user-uploaded and free trading bots.
  - `id` (uuid, primary key)
  - `deriv_account_id` (text, the Deriv loginid of the owner; for free bots this is 'system')
  - `name` (text, not null)
  - `description` (text, default empty)
  - `strategy_type` (text, one of: martingale, grid, trend_follow, mean_reversion, custom)
  - `config` (jsonb, the bot's configuration/parameters)
  - `is_free` (boolean, default false — true for bots available to everyone)
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now)
- `quick_strategies` — stores user's quick strategy presets.
  - `id` (uuid, primary key)
  - `deriv_account_id` (text, not null)
  - `name` (text, not null)
  - `symbol` (text, not null)
  - `contract_type` (text, not null — CALL or PUT)
  - `stake` (numeric, default 1)
  - `duration` (integer, default 5)
  - `duration_unit` (text, default 'm')
  - `martingale_steps` (integer, default 0)
  - `martingale_multiplier` (numeric, default 2)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on both tables.
- This app uses Deriv OAuth (not Supabase auth), so the anon key is used.
  Policies allow anon + authenticated CRUD since there is no Supabase auth session.
  Ownership is tracked via `deriv_account_id` column (the Deriv loginid stored in sessionStorage).

3. Seed Data
- Insert 4 free bots: Martingale Recovery, Grid Trader, Trend Surfer, Mean Reversion Bot.

4. Important Notes
- The `deriv_account_id` column ties bots to a Deriv account, not a Supabase user.
  Free bots use 'system' as the deriv_account_id.
- `config` jsonb stores bot parameters like entry/exit rules, risk management, etc.
*/

CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deriv_account_id text NOT NULL DEFAULT 'system',
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  strategy_type text NOT NULL DEFAULT 'custom' CHECK (strategy_type IN ('martingale', 'grid', 'trend_follow', 'mean_reversion', 'custom')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_free boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bots" ON bots;
CREATE POLICY "anon_select_bots" ON bots FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bots" ON bots;
CREATE POLICY "anon_insert_bots" ON bots FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bots" ON bots;
CREATE POLICY "anon_update_bots" ON bots FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bots" ON bots;
CREATE POLICY "anon_delete_bots" ON bots FOR DELETE
  TO anon, authenticated USING (true);

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
  created_at timestamptz NOT NULL DEFAULT now()
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

-- Seed free bots
INSERT INTO bots (deriv_account_id, name, description, strategy_type, config, is_free) VALUES
  ('system', 'Martingale Recovery', 'Doubles stake after each loss to recover previous losses plus profit. Configurable max steps and multiplier.', 'martingale', '{"max_steps": 5, "multiplier": 2, "initial_stake": 1, "take_profit": 10, "stop_loss": 50}', true),
  ('system', 'Grid Trader', 'Places trades at regular price intervals to capture market oscillation. Works best in ranging markets.', 'grid', '{"grid_levels": 5, "grid_spacing": 10, "stake_per_level": 1, "direction": "both"}', true),
  ('system', 'Trend Surfer', 'Follows the prevailing market trend using moving average crossover signals. Enters on confirmed trend direction.', 'trend_follow', '{"fast_period": 5, "slow_period": 20, "stake": 1, "trend_confirm_bars": 3}', true),
  ('system', 'Mean Reversion Bot', 'Trades against extreme price moves expecting a return to the mean. Uses Bollinger Band extremes for entry.', 'mean_reversion', '{"bb_period": 20, "bb_std": 2, "stake": 1, "max_holding_ticks": 10}', true)
ON CONFLICT DO NOTHING;
