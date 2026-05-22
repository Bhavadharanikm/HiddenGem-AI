import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { extractDriveFileId } from "@/lib/google-drive/client";
import { syncDocument } from "@/lib/google-drive/sync";

function isDashboard(req: NextRequest) {
  return req.headers.get("X-Dashboard-Session") === "1";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDashboard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getServiceClient();

  const { data, error } = await db
    .from("knowledge_documents")
    .select("id, name, google_doc_url, mime_type, status, last_modified_at, created_at")
    .eq("tenant_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ docs: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDashboard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: { drive_url: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.drive_url) {
    return NextResponse.json({ error: "'drive_url' is required" }, { status: 400 });
  }

  const db = getServiceClient();
  const fileId = extractDriveFileId(body.drive_url);

  if (fileId) {
    const { data: doc, error: dbErr } = await db
      .from("knowledge_documents")
      .upsert(
        {
          tenant_id: id,
          name: body.name ?? body.drive_url,
          google_drive_id: fileId,
          google_doc_url: body.drive_url,
          status: "pending",
        },
        { onConflict: "tenant_id,google_drive_id" }
      )
      .select("id, name, google_doc_url, status")
      .single();

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    // Kick off sync without blocking the response
    syncDocument(doc.id).catch((err) =>
      console.error(`[knowledge] Sync failed for doc ${doc.id}:`, err)
    );

    return NextResponse.json({ doc }, { status: 201 });
  } else {
    // No file ID extracted — save the URL as-is
    const { data: doc, error: dbErr } = await db
      .from("knowledge_documents")
      .insert({
        tenant_id: id,
        name: body.name ?? body.drive_url,
        google_drive_id: "",
        google_doc_url: body.drive_url,
        status: "pending",
      })
      .select("id, name, google_doc_url, status")
      .single();

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    // Kick off sync without blocking the response
    syncDocument(doc.id).catch((err) =>
      console.error(`[knowledge] Sync failed for doc ${doc.id}:`, err)
    );

    return NextResponse.json({ doc }, { status: 201 });
  }
}
