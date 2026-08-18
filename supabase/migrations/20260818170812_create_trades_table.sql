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