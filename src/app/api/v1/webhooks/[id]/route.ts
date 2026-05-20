import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const { id } = await params;
  const db = getServiceClient();

  const { data, error: dbErr } = await db
    .from("webhook_endpoints")
    .select("id, name, url, events, is_active, created_at")
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);
  if (!data) return error("NOT_FOUND", "Webhook endpoint not found");

  // Also include recent deliveries
  const { data: deliveries } = await db
    .from("webhook_deliveries")
    .select("id, event_type, status, attempts, last_attempt_at, response_status")
    .eq("endpoint_id", id)
    .eq("tenant_id", auth.tenantId)
    .order("created_at", { ascending: false })
    .limit(20);

  return ok({ ...data, recent_deliveries: deliveries ?? [] });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const { id } = await params;
  const db = getServiceClient();

  let body: { url?: string; events?: string[]; name?: string; is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON body");
  }

  const { data, error: dbErr } = await db
    .from("webhook_endpoints")
    .update({
      ...(body.url && { url: body.url }),
      ...(body.events && { events: body.events }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .select("id, name, url, events, is_active")
    .maybeSingle();

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);
  if (!data) return error("NOT_FOUND", "Webhook endpoint not found");
  return ok(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const { id } = await params;
  const db = getServiceClient();

  const { error: dbErr } = await db
    .from("webhook_endpoints")
    .delete()
    .eq("id", id)
    .eq("tenant_id", auth.tenantId);

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);
  return ok({ deleted: true });
}
