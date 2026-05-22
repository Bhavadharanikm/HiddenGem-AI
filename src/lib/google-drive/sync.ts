import { getServiceClient } from "@/lib/supabase/service";

const CHUNK_SIZE = 400;
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

/** Sync a single knowledge document: fetch content, chunk, embed, upsert. */
export async function syncDocument(documentId: string): Promise<void> {
  const db = getServiceClient();

  const setError = (msg: string) =>
    db.from("knowledge_documents").update({
      status: "error",
      error_msg: msg,
      updated_at: new Date().toISOString(),
    }).eq("id", documentId);

  const { data: doc, error: docErr } = await db
    .from("knowledge_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docErr || !doc) {
    await setError("Document not found");
    throw new Error("Document not found");
  }

  await db
    .from("knowledge_documents")
    .update({ status: "processing" })
    .eq("id", documentId);

  try {
    const exportUrl = `https://docs.google.com/document/d/${doc.google_drive_id}/export?format=txt`;
    const res = await fetch(exportUrl);
    if (!res.ok) {
      throw new Error("Could not fetch document. Make sure the link is set to 'Anyone with the link can view'.");
    }
    const content = await res.text();
    if (!content.trim()) {
      throw new Error("Document appears to be empty.");
    }

    const chunks = chunkText(content);

    // Delete old chunks
    await db.from("knowledge_chunks").delete().eq("document_id", documentId);

    // Insert new chunks
    const rows = chunks.map((text, i) => ({
      tenant_id: doc.tenant_id,
      document_id: documentId,
      chunk_index: i,
      content: text,
      token_count: Math.round(text.split(/\s+/).length * 1.3),
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
    await setError(err instanceof Error ? err.message : "Unknown error");
    throw err;
  }
}

/** Re-sync all pending/error docs and check ready docs for updates. */
export async function syncTenantDocuments(tenantId: string): Promise<{
  synced: number;
  unchanged: number;
  errors: number;
}> {
  const db = getServiceClient();

  const { data: docs } = await db
    .from("knowledge_documents")
    .select("id, google_drive_id, last_modified_at, status")
    .eq("tenant_id", tenantId)
    .in("status", ["ready", "pending", "error"]);

  if (!docs?.length) return { synced: 0, unchanged: 0, errors: 0 };

  let synced = 0, unchanged = 0, errors = 0;

  for (const doc of docs) {
    try {
      // For ready docs, check if the public doc has been modified
      if (doc.status === "ready" && doc.last_modified_at) {
        const headRes = await fetch(
          `https://docs.google.com/document/d/${doc.google_drive_id}/export?format=txt`,
          { method: "HEAD" }
        );
        const lastModified = headRes.headers.get("last-modified");
        if (lastModified) {
          const remoteModified = new Date(lastModified);
          const localModified = new Date(doc.last_modified_at);
          if (remoteModified <= localModified) { unchanged++; continue; }
        }
      }
      await syncDocument(doc.id);
      synced++;
    } catch {
      errors++;
    }
  }

  return { synced, unchanged, errors };
}
