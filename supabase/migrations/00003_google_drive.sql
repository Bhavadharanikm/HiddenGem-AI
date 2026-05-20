CREATE TABLE google_drive_connections (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  access_token     TEXT NOT NULL,
  refresh_token    TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes           TEXT[],
  connected_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

CREATE TABLE knowledge_documents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  google_drive_id  TEXT NOT NULL,
  google_doc_url   TEXT NOT NULL,
  mime_type        TEXT,
  last_modified_at TIMESTAMPTZ,
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_msg        TEXT,
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, google_drive_id)
);

CREATE TABLE knowledge_chunks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id   UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  token_count   INTEGER,
  embedding     VECTOR(1536),
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX knowledge_chunks_tenant_idx ON knowledge_chunks(tenant_id);
CREATE INDEX knowledge_documents_tenant_idx ON knowledge_documents(tenant_id);

CREATE TRIGGER knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  p_tenant_id    UUID,
  p_embedding    VECTOR(1536),
  p_match_count  INT DEFAULT 8,
  p_threshold    FLOAT DEFAULT 0.70
)
RETURNS TABLE (
  id            UUID,
  content       TEXT,
  document_name TEXT,
  similarity    FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kd.name AS document_name,
    1 - (kc.embedding <=> p_embedding) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kc.document_id = kd.id
  WHERE kc.tenant_id = p_tenant_id
    AND kd.status = 'ready'
    AND 1 - (kc.embedding <=> p_embedding) >= p_threshold
  ORDER BY kc.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;
