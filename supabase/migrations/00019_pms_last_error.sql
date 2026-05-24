-- Store the last sync error message so it can be surfaced in the UI
-- without requiring access to Netlify function logs.
ALTER TABLE pms_connections ADD COLUMN IF NOT EXISTS last_error text;
