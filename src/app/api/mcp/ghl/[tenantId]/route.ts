import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/crypto/credentials";

const GHL_MCP_URL = "https://services.leadconnectorhq.com/mcp/";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Anthropic calls this proxy with: Authorization: Bearer <CRON_SECRET>
// We look up the tenant's GHL credentials and forward with proper headers.
export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  const internalSecret = process.env.CRON_SECRET ?? process.env.ANTHROPIC_API_KEY;
  if (!internalSecret || req.headers.get("authorization") !== `Bearer ${internalSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const { data: conn } = await db
    .from("ghl_connections")
    .select("access_token, location_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!conn) return new Response("No active GHL connection for tenant", { status: 404 });

  const accessToken = await decryptToken(conn.access_token);

  const body = await req.text();
  const ghlRes = await fetch(GHL_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${accessToken}`,
      "locationId": conn.location_id,
    },
    body,
  });

  const responseBody = await ghlRes.arrayBuffer();
  return new Response(responseBody, {
    status: ghlRes.status,
    headers: {
      "Content-Type": ghlRes.headers.get("Content-Type") ?? "application/json",
    },
  });
}

// MCP also uses GET for SSE-based transports — forward as-is
export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  const internalSecret = process.env.CRON_SECRET ?? process.env.ANTHROPIC_API_KEY;
  if (!internalSecret || req.headers.get("authorization") !== `Bearer ${internalSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const { data: conn } = await db
    .from("ghl_connections")
    .select("access_token, location_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!conn) return new Response("No active GHL connection for tenant", { status: 404 });

  const accessToken = await decryptToken(conn.access_token);

  const url = new URL(GHL_MCP_URL);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const ghlRes = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "locationId": conn.location_id,
    },
  });

  const responseBody = await ghlRes.arrayBuffer();
  return new Response(responseBody, {
    status: ghlRes.status,
    headers: {
      "Content-Type": ghlRes.headers.get("Content-Type") ?? "application/json",
    },
  });
}
