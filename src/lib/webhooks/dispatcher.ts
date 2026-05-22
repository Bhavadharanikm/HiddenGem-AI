import { getServiceClient } from "@/lib/supabase/service";
import type { WebhookEventType, WebhookPayload } from "./events";

const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000, 7_200_000, 28_800_000, 86_400_000];

/** Enqueue webhook deliveries for all active endpoints subscribed to the event. */
export async function dispatchWebhook(
  tenantId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  const db = getServiceClient();

  const { data: endpoints } = await db
    .from("webhook_endpoints")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .contains("events", [event]);

  if (!endpoints?.length) return;

  const payload: WebhookPayload = {
    event,
    tenant_id: tenantId,
    timestamp: new Date().toISOString(),
    data,
  };

  const rows = endpoints.map((ep) => ({
    tenant_id: tenantId,
    endpoint_id: ep.id,
    event_type: event,
    payload: payload as unknown as import("@/types/database").Json,
    status: "pending" as const,
    next_retry_at: new Date().toISOString(),
  }));

  await db.from("webhook_deliveries").insert(rows);
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Deliver a single pending webhook_delivery row. Called by the Edge Function. */
export async function deliverWebhook(deliveryId: string): Promise<void> {
  const db = getServiceClient();

  const { data: delivery } = await db
    .from("webhook_deliveries")
    .select("*, webhook_endpoints!inner(url, secret)")
    .eq("id", deliveryId)
    .single();

  if (!delivery) throw new Error(`Delivery ${deliveryId} not found`);

  const endpoint = (delivery as unknown as { webhook_endpoints: { url: string; secret: string } }).webhook_endpoints;

  const payloadStr = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = `sha256=${await hmacSha256(endpoint.secret, `${timestamp}.${payloadStr}`)}`;

  let responseStatus = 0;
  let responseBody = "";
  let success = false;

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-HiddenGem-Signature": signature,
        "X-HiddenGem-Timestamp": timestamp,
        "X-HiddenGem-Event": delivery.event_type,
        "X-HiddenGem-Delivery": deliveryId,
      },
      body: payloadStr,
      signal: AbortSignal.timeout(10_000),
    });

    responseStatus = res.status;
    responseBody = await res.text().catch(() => "");
    success = res.ok;
  } catch (err) {
    responseBody = err instanceof Error ? err.message : "Network error";
  }

  const attempts = (delivery.attempts ?? 0) + 1;
  const nextDelay = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
  const isFinalAttempt = attempts >= RETRY_DELAYS_MS.length;

  await db.from("webhook_deliveries").update({
    status: success ? "delivered" : isFinalAttempt ? "failed" : "retrying",
    attempts,
    last_attempt_at: new Date().toISOString(),
    next_retry_at: success || isFinalAttempt
      ? null
      : new Date(Date.now() + nextDelay).toISOString(),
    response_status: responseStatus,
    response_body: responseBody.slice(0, 1000),
  }).eq("id", deliveryId);
}
