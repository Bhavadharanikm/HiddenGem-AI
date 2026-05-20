import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";
import { nanoid } from "nanoid";
import type { WebhookEventType } from "@/lib/webhooks/events";

const VALID_EVENTS: WebhookEventType[] = [
  "chat.completed",
  "sync.pms.finished",
  "sync.meta.finished",
  "document.ready",
  "document.error",
  "analysis.ready",
];

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const db = getServiceClient();
  const { data, error: dbErr } = await db
    .from("webhook_endpoints")
    .select("id, name, url, events, is_active, created_at")
    .eq("tenant_id", auth.tenantId)
    .order("created_at", { ascending: false });

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);
  return ok(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  let body: { url: string; events: WebhookEventType[]; name?: string; secret?: string };
  try {
    body = await req.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON body");
  }

  if (!body.url) return error("BAD_REQUEST", "'url' is required");
  if (!body.events?.length) return error("BAD_REQUEST", "'events' must be a non-empty array");

  const invalidEvents = body.events.filter((e) => !VALID_EVENTS.includes(e));
  if (invalidEvents.length) {
    return error("BAD_REQUEST", `Unknown events: ${invalidEvents.join(", ")}`);
  }

  try {
    new URL(body.url);
  } catch {
    return error("BAD_REQUEST", "Invalid 'url' — must be a valid HTTPS URL");
  }

  const secret = body.secret ?? `whsec_${nanoid(32)}`;
  const db = getServiceClient();

  const { data, error: dbErr } = await db
    .from("webhook_endpoints")
    .insert({
      tenant_id: auth.tenantId,
      name: body.name ?? null,
      url: body.url,
      secret,
      events: body.events,
      is_active: true,
    })
    .select("id, name, url, events, is_active, created_at")
    .single();

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);

  return ok({ ...data, secret });
}
