CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL UNIQUE,
  key_prefix    TEXT NOT NULL,
  scopes        TEXT[] DEFAULT ARRAY['chat', 'read'],
  rate_limit    INTEGER DEFAULT 100,
  is_active     BOOLEAN DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX api_keys_hash_idx ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX api_keys_tenant_idx ON api_keys(tenant_id);

CREATE OR REPLACE FUNCTION resolve_api_key(p_key_hash TEXT)
RETURNS TABLE(tenant_id UUID, scopes TEXT[], rate_limit INTEGER, key_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE api_keys
  SET last_used_at = now()
  WHERE key_hash = p_key_hash
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING api_keys.tenant_id, api_keys.scopes, api_keys.rate_limit, api_keys.id;
END;
$$;
