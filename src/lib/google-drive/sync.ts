import OpenAI from "openai";
import { getServiceClient } from "@/lib/supabase/service";
import { fetchDocumentContent, getFileMetadata } from "./client";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}
const CHUNK_SIZE = 400; // tokens (~1600 chars)
const CHUNK_OVERLAP = 50;

function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const slice = words.slice(i, i + CHUNK_SIZE);
    chunks.push(slice.join(" "));
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.trim().length > 20);
}

async function embedChunks(texts: string[]): Promise<number[][]> {
  const res = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

/** Sync a single knowledge document: fetch content, chunk, embed, upsert. */
export async function syncDocument(documentId: string): Promise<void> {
  const db = getServiceClient();

  const { data: doc, error: docErr } = await db
    .from("knowledge_documents")
    .select("*, google_drive_connections!inner(access_token, refresh_token)")
    .eq("id", documentId)
    .single();

  if (docErr || !doc) throw new Error("Document not found");

  await db
    .from("knowledge_documents")
    .update({ status: "processing" })
    .eq("id", documentId);

  try {
    const conn = (doc as unknown as { google_drive_connections: { access_token: string; refresh_token: string } }).google_drive_connections;

    const content = await fetchDocumentContent(
      conn.access_token,
      conn.refresh_token,
      doc.google_drive_id,
      doc.mime_type ?? "application/vnd.google-apps.document"
    );

    const chunks = chunkText(content);
    const embeddings = await embedChunks(chunks);

    // Delete old chunks
    await db.from("knowledge_chunks").delete().eq("document_id", documentId);

    // Insert new chunks
    const rows = chunks.map((text, i) => ({
      tenant_id: doc.tenant_id,
      document_id: documentId,
      chunk_index: i,
      content: text,
      token_count: Math.round(text.split(/\s+/).length * 1.3),
      embedding: JSON.stringify(embeddings[i]),
    }));

    const { error: insertErr } = await db
      .from("knowledge_chunks")
      .insert(rows);

    if (insertErr) throw new Error(insertErr.message);

    await db
      .from("knowledge_documents")
      .update({
        status: "ready",
        last_modified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);
  } catch (err) {
    await db
      .from("knowledge_documents")
      .update({
        status: "error",
        error_msg: err instanceof Error ? err.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);
    throw err;
  }
}

/** Check all tenant docs for changes and re-sync modified ones. */
export async function syncTenantDocuments(tenantId: string): Promise<{
  synced: number;
  unchanged: number;
  errors: number;
}> {
  const db = getServiceClient();

  const { data: conn } = await db
    .from("google_drive_connections")
    .select("access_token, refresh_token")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!conn) return { synced: 0, unchanged: 0, errors: 0 };

  const { data: docs } = await db
    .from("knowledge_documents")
    .select("id, google_drive_id, mime_type, last_modified_at")
    .eq("tenant_id", tenantId)
    .eq("status", "ready");

  if (!docs?.length) return { synced: 0, unchanged: 0, errors: 0 };

  const c = conn as { access_token: string; refresh_token: string };
  let synced = 0, unchanged = 0, errors = 0;

  for (const doc of docs) {
    try {
      const meta = await getFileMetadata(c.access_token, c.refresh_token, doc.google_drive_id);
      const remoteModified = meta.modifiedTime ? new Date(meta.modifiedTime) : null;
      const localModified = doc.last_modified_at ? new Date(doc.last_modified_at) : null;

      if (remoteModified && localModified && remoteModified <= localModified) {
        unchanged++;
        continue;
      }

      await syncDocument(doc.id);
      synced++;
    } catch {
      errors++;
    }
  }

  return { synced, unchanged, errors };
}
