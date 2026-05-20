CREATE TABLE webhook_endpoints (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT,
  url           TEXT NOT NULL,
  secret        TEXT NOT NULL,
  events        TEXT[] NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint_id     UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
  attempts        INTEGER DEFAULT 0,
  next_retry_at   TIMESTAMPTZ DEFAULT now(),
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX webhook_deliveries_pending_idx
  ON webhook_deliveries(next_retry_at)
  WHERE status IN ('pending', 'retrying');

CREATE INDEX webhook_deliveries_tenant_idx ON webhook_deliveries(tenant_id, created_at DESC);
CREATE INDEX webhook_endpoints_tenant_idx ON webhook_endpoints(tenant_id);

CREATE TRIGGER webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
