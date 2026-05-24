import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { encryptToken } from "@/lib/crypto/credentials";

const GHL_MCP_URL = "https://services.leadconnectorhq.com/mcp/";

function getTenantId(req: NextRequest): string | null {
  if (req.headers.get("X-Dashboard-Session") !== "1") return null;
  return req.nextUrl.searchParams.get("tenant_id");
}

// GET — return current GHL connection status
export async function GET(req: NextRequest) {
  const tenantId = getTenantId(req);
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 401 });

  const db = getServiceClient();
  const { data } = await db
    .from("ghl_connections")
    .select("id, location_id, location_name, is_active, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .maybeSingle();

  return NextResponse.json({ connection: data ?? null });
}

// POST — save (or update) GHL connection after verifying the token
export async function POST(req: NextRequest) {
  const tenantId = getTenantId(req);
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 401 });

  let body: { location_id?: string; access_token?: string; location_name?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { location_id, access_token, location_name } = body;
  if (!location_id?.trim()) return NextResponse.json({ error: "location_id is required" }, { status: 400 });
  if (!access_token?.trim()) return NextResponse.json({ error: "access_token is required" }, { status: 400 });

  // Test the credentials by calling the GHL MCP server (tools/list)
  try {
    const testRes = await fetch(GHL_MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": `Bearer ${access_token}`,
        "locationId": location_id,
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", params: {}, id: 1 }),
    });
    if (!testRes.ok) {
      const text = await testRes.text().catch(() => "");
      return NextResponse.json({ error: `GHL connection test failed (${testRes.status}): ${text.slice(0, 200)}` }, { status: 400 });
    }
    const json = await testRes.json().catch(() => null);
    if (json?.error) {
      return NextResponse.json({ error: `GHL returned error: ${JSON.stringify(json.error).slice(0, 200)}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: `Could not reach GHL MCP server: ${err instanceof Error ? err.message : String(err)}` }, { status: 400 });
  }

  const encryptedToken = await encryptToken(access_token);
  const db = getServiceClient();

  const { data, error: dbErr } = await db
    .from("ghl_connections")
    .upsert(
      {
        tenant_id: tenantId,
        location_id: location_id.trim(),
        location_name: location_name?.trim() || null,
        access_token: encryptedToken,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" }
    )
    .select("id, location_id, location_name, is_active, created_at, updated_at")
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ connection: data });
}

// DELETE — disconnect GHL
export async function DELETE(req: NextRequest) {
  const tenantId = getTenantId(req);
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 401 });

  const db = getServiceClient();
  await db.from("ghl_connections").update({ is_active: false }).eq("tenant_id", tenantId);
  return NextResponse.json({ disconnected: true });
}

