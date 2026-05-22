CREATE TABLE conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_id  TEXT,
  title        TEXT,
  source       TEXT DEFAULT 'api' CHECK (source IN ('api', 'dashboard', 'widget')),
  metadata     JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content         JSONB NOT NULL,
  tool_use        JSONB,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  model           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX messages_tenant_idx ON messages(tenant_id, created_at DESC);
CREATE INDEX conversations_tenant_idx ON conversations(tenant_id, updated_at DESC);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
