CREATE TABLE pms_connections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('guesty', 'hostaway', 'lodgify', 'custom')),
  credentials   JSONB NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  last_sync_at  TIMESTAMPTZ,
  sync_status   TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'running', 'error')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pms_properties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id   UUID NOT NULL REFERENCES pms_connections(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  address         JSONB,
  bedrooms        INTEGER,
  bathrooms       NUMERIC(3,1),
  amenities       TEXT[],
  base_price      NUMERIC(10,2),
  currency        TEXT DEFAULT 'USD',
  raw_data        JSONB,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(connection_id, external_id)
);

CREATE TABLE pms_bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id       UUID NOT NULL REFERENCES pms_properties(id) ON DELETE CASCADE,
  external_id       TEXT NOT NULL,
  status            TEXT,
  check_in          DATE,
  check_out         DATE,
  guests            INTEGER,
  total_revenue     NUMERIC(10,2),
  platform          TEXT,
  raw_data          JSONB,
  synced_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, external_id)
);

CREATE TABLE pms_reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES pms_properties(id) ON DELETE CASCADE,
  external_id   TEXT NOT NULL,
  rating        NUMERIC(3,2),
  reviewer_name TEXT,
  review_text   TEXT,
  response_text TEXT,
  review_date   DATE,
  raw_data      JSONB,
  synced_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, external_id)
);

CREATE INDEX pms_bookings_tenant_dates ON pms_bookings(tenant_id, check_in, check_out);
CREATE INDEX pms_properties_tenant_idx ON pms_properties(tenant_id);
CREATE INDEX pms_connections_tenant_idx ON pms_connections(tenant_id);
