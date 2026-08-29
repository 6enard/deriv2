/*
# Create bots table

1. New Tables
- `bots` — stores trading bot configurations created by users or shared as free.
  - `id` (uuid, primary key)
  - `deriv_account_id` (text, not null, default 'system') — owner's Deriv account; 'system' for free/community bots
  - `name` (text, not null)
  - `description` (text, default '')
  - `strategy_type` (text, default 'custom') — martingale, grid, trend_follow, mean_reversion, custom
  - `config` (jsonb, default '{}') — bot configuration JSON
  - `is_free` (boolean, default false) — whether the bot is shared with all users
  - `is_active` (boolean, default true) — whether the bot is currently active
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `bots`.
- Same rationale as trades: no Supabase sign-in, anon-key frontend.
  Data is intentionally shared (free bots are visible to all, personal bots
  are filtered by deriv_account_id in the frontend). USING (true) is intentional.
- 4 policies: select, insert, update, delete — all `TO anon, authenticated`.

3. Important Notes
- The Dashboard page reads bots filtered by deriv_account_id (personal) and is_free (community).
- strategy_type has a CHECK constraint limiting to valid values.
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
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
