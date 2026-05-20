import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";
import { extractDriveFileId, getFileMetadata } from "@/lib/google-drive/client";
import { syncDocument } from "@/lib/google-drive/sync";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const db = getServiceClient();
  const { data, error: dbErr } = await db
    .from("knowledge_documents")
    .select(
      "id, name, google_doc_url, mime_type, status, last_modified_at, created_at"
    )
    .eq("tenant_id", auth.tenantId)
    .order("created_at", { ascending: false });

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);
  return ok(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  let body: { drive_url: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON body");
  }

  if (!body.drive_url) return error("BAD_REQUEST", "'drive_url' is required");

  const fileId = extractDriveFileId(body.drive_url);
  if (!fileId) return error("BAD_REQUEST", "Could not extract Google Drive file ID from URL");

  const db = getServiceClient();

  // Get the Drive connection for this tenant
  const { data: conn } = await db
    .from("google_drive_connections")
    .select("access_token, refresh_token")
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  if (!conn) {
    return error(
      "BAD_REQUEST",
      "No Google Drive connection found. Connect Drive first at /api/v1/google-drive/connect"
    );
  }

  const c = conn as { access_token: string; refresh_token: string };

  // Get file metadata
  const meta = await getFileMetadata(c.access_token, c.refresh_token, fileId).catch(() => null);
  if (!meta) return error("BAD_REQUEST", "Could not access Google Drive file. Ensure the file is shared.");

  // Upsert the document record
  const { data: doc, error: dbErr } = await db
    .from("knowledge_documents")
    .upsert(
      {
        tenant_id: auth.tenantId,
        name: body.name ?? meta.name ?? fileId,
        google_drive_id: fileId,
        google_doc_url: body.drive_url,
        mime_type: meta.mimeType ?? null,
        status: "pending",
      },
      { onConflict: "tenant_id,google_drive_id" }
    )
    .select("id")
    .single();

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);

  // Kick off async embedding
  syncDocument(doc.id).catch((err) =>
    console.error("[knowledge/sync]", err)
  );

  return ok({ id: doc.id, status: "processing" });
}
