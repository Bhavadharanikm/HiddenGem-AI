CREATE TABLE meta_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ad_account_id    TEXT NOT NULL,
  page_id          TEXT,
  access_token     TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes           TEXT[],
  is_active        BOOLEAN DEFAULT true,
  last_sync_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, ad_account_id)
);

CREATE TABLE meta_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id   UUID NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  status          TEXT,
  objective       TEXT,
  budget_type     TEXT,
  daily_budget    NUMERIC(12,2),
  lifetime_budget NUMERIC(12,2),
  start_time      TIMESTAMPTZ,
  stop_time       TIMESTAMPTZ,
  raw_data        JSONB,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(connection_id, external_id)
);

CREATE TABLE meta_ad_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES meta_campaigns(id) ON DELETE CASCADE,
  date_start      DATE NOT NULL,
  date_stop       DATE NOT NULL,
  impressions     BIGINT DEFAULT 0,
  reach           BIGINT DEFAULT 0,
  clicks          BIGINT DEFAULT 0,
  spend           NUMERIC(12,2) DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  revenue         NUMERIC(12,2) DEFAULT 0,
  cpm             NUMERIC(8,4),
  cpc             NUMERIC(8,4),
  ctr             NUMERIC(8,6),
  roas            NUMERIC(8,4),
  raw_data        JSONB,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, date_start, date_stop)
);

CREATE TABLE meta_audiences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id     UUID NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
  external_id       TEXT NOT NULL,
  name              TEXT NOT NULL,
  type              TEXT CHECK (type IN ('custom', 'lookalike', 'saved')),
  subtype           TEXT,
  description       TEXT,
  approximate_count BIGINT,
  raw_data          JSONB,
  synced_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(connection_id, external_id)
);

CREATE INDEX meta_insights_tenant_date ON meta_ad_insights(tenant_id, date_start DESC);
CREATE INDEX meta_campaigns_tenant_idx ON meta_campaigns(tenant_id);
CREATE INDEX meta_audiences_tenant_idx ON meta_audiences(tenant_id);
