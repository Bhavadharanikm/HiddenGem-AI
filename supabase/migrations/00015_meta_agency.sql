-- Shared agency-level Meta OAuth token (one row, replaces per-tenant model)
CREATE TABLE meta_agency_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token     TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes           TEXT[],
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Per-client mapping: which ad account from the agency does this client use?
CREATE TABLE meta_client_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  ad_account_id  TEXT NOT NULL,
  account_name   TEXT,
  is_active      BOOLEAN DEFAULT true,
  last_sync_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Relax meta_campaigns: drop old per-connection unique constraint, allow null connection_id,
-- add new unique on (tenant_id, external_id)
ALTER TABLE meta_campaigns DROP CONSTRAINT IF EXISTS meta_campaigns_connection_id_external_id_key;
ALTER TABLE meta_campaigns ALTER COLUMN connection_id DROP NOT NULL;
ALTER TABLE meta_campaigns ADD CONSTRAINT meta_campaigns_tenant_external_key UNIQUE (tenant_id, external_id);

-- Same for meta_audiences
ALTER TABLE meta_audiences DROP CONSTRAINT IF EXISTS meta_audiences_connection_id_external_id_key;
ALTER TABLE meta_audiences ALTER COLUMN connection_id DROP NOT NULL;
ALTER TABLE meta_audiences ADD CONSTRAINT meta_audiences_tenant_external_key UNIQUE (tenant_id, external_id);

-- Clean up stale placeholder rows from the old per-tenant flow
DELETE FROM meta_connections WHERE ad_account_id = 'pending';
