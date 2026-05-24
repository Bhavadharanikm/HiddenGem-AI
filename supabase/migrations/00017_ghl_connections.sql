-- GoHighLevel CRM connections (one per tenant)
CREATE TABLE IF NOT EXISTS ghl_connections (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id   TEXT        NOT NULL,
  location_name TEXT,
  access_token  TEXT        NOT NULL,   -- encrypted via encryptToken if PMS_ENCRYPTION_KEY set
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ghl_connections_tenant_id_unique UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS ghl_connections_tenant_idx ON ghl_connections (tenant_id);
