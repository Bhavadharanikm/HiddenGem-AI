CREATE TABLE performance_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_date   DATE NOT NULL,
  metric_type   TEXT NOT NULL,
  metric_value  NUMERIC(20,6),
  dimensions    JSONB DEFAULT '{}'::jsonb,
  source        TEXT CHECK (source IN ('manual', 'pms_derived', 'meta_derived')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, metric_date, metric_type, dimensions)
);

CREATE TABLE campaign_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_name   TEXT NOT NULL,
  campaign_type   TEXT,
  start_date      DATE,
  end_date        DATE,
  budget          NUMERIC(12,2),
  goals           JSONB,
  results         JSONB,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX performance_metrics_tenant_date ON performance_metrics(tenant_id, metric_date DESC);
CREATE INDEX campaign_history_tenant_idx ON campaign_history(tenant_id, start_date DESC);
