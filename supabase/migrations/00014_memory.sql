-- Client memories: facts Claude saves during conversations
CREATE TABLE IF NOT EXISTS client_memories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content     text        NOT NULL,
  category    text        NOT NULL DEFAULT 'fact'
                          CHECK (category IN ('preference','insight','fact','goal','issue')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_memories_tenant_idx ON client_memories(tenant_id, created_at DESC);

-- Conversation summaries: generated after each session ends
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS summary text;
