/*
# Update free bots with executable trade configurations

1. Changes
- Updates the 4 seeded free bots so their `config` jsonb includes all fields
  required by the activate flow: symbol, contract_type, stake, duration,
  duration_unit, plus their strategy-specific parameters.
- Previously the configs lacked `symbol` / `contract_type`, which caused the
  "This bot has no market selected" error when activating.

2. Important Notes
- Uses UPDATE (not DELETE/INSERT) to preserve existing row IDs.
- Only touches rows where is_free = true and deriv_account_id = 'system'.
*/

UPDATE bots SET config = '{"symbol": "R_10", "contract_type": "CALL", "stake": 1, "duration": 5, "duration_unit": "t", "max_steps": 5, "multiplier": 2, "initial_stake": 1, "take_profit": 10, "stop_loss": 50}'::jsonb, updated_at = now()
WHERE is_free = true AND deriv_account_id = 'system' AND name = 'Martingale Recovery';

UPDATE bots SET config = '{"symbol": "R_10", "contract_type": "CALL", "stake": 1, "duration": 5, "duration_unit": "t", "grid_levels": 5, "grid_spacing": 10, "stake_per_level": 1, "direction": "both"}'::jsonb, updated_at = now()
WHERE is_free = true AND deriv_account_id = 'system' AND name = 'Grid Trader';

UPDATE bots SET config = '{"symbol": "R_10", "contract_type": "CALL", "stake": 1, "duration": 5, "duration_unit": "t", "fast_period": 5, "slow_period": 20, "trend_confirm_bars": 3}'::jsonb, updated_at = now()
WHERE is_free = true AND deriv_account_id = 'system' AND name = 'Trend Surfer';

UPDATE bots SET config = '{"symbol": "R_10", "contract_type": "PUT", "stake": 1, "duration": 5, "duration_unit": "t", "bb_period": 20, "bb_std": 2, "max_holding_ticks": 10}'::jsonb, updated_at = now()
WHERE is_free = true AND deriv_account_id = 'system' AND name = 'Mean Reversion Bot';
