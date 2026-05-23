import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { encryptCredentials } from "@/lib/crypto/credentials";
import { createPMSAdapter } from "@/lib/pms/factory";
import type { PMSProvider } from "@/lib/pms/adapter";

export const maxDuration = 30;

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
    .from("pms_connections")
    .select("id, provider, last_sync_at, sync_status, is_active")
    .eq("tenant_id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connection: data ?? null });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDashboard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: { provider: string; credentials: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.provider || !body.credentials) {
    return NextResponse.json({ error: "'provider' and 'credentials' are required" }, { status: 400 });
  }

  // Test the credentials before storing them
  try {
    const adapter = createPMSAdapter(body.provider as PMSProvider, body.credentials);
    const test = await adapter.testConnection();
    if (!test.ok) {
      return NextResponse.json({ error: `Connection test failed: ${test.error ?? "Invalid credentials"}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Connection test failed: ${err instanceof Error ? err.message : "Invalid credentials"}` },
      { status: 400 }
    );
  }

  const db = getServiceClient();

  const encryptedCredentials = await encryptCredentials(body.credentials);

  const { data, error } = await db
    .from("pms_connections")
    .upsert(
      {
        tenant_id: id,
        provider: body.provider as "guesty" | "hostaway" | "lodgify" | "custom",
        credentials: encryptedCredentials,
        is_active: true,
        sync_status: "idle",
      },
      { onConflict: "tenant_id" }
    )
    .select("id, provider, last_sync_at, sync_status, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connection: data });
}

// PATCH — reset a stuck sync back to idle
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDashboard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getServiceClient();

  const { error } = await db
    .from("pms_connections")
    .update({ sync_status: "idle" })
    .eq("tenant_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reset: true });
}
