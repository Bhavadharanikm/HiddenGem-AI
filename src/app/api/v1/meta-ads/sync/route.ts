import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { syncMetaAds } from "@/lib/meta/sync";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";

export async function POST(req: NextRequest) {
  const isDashboard = req.headers.get("X-Dashboard-Session") === "1";

  let tenantId: string;

  if (isDashboard) {
    let body: { tenant_id?: string };
    try { body = await req.json(); } catch { body = {}; }
    if (!body.tenant_id) return error("UNAUTHORIZED", "tenant_id required");
    tenantId = body.tenant_id;
  } else {
    const auth = await validateApiKey(req);
    if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");
    tenantId = auth.tenantId;
  }

  const result = await syncMetaAds(tenantId).catch((err) => {
    console.error("[meta-ads/sync]", err);
    return null;
  });

  if (!result) return error("INTERNAL_ERROR", "Meta Ads sync failed");

  await dispatchWebhook(tenantId, "sync.meta.finished", result).catch(() => {});
  return ok(result);
}
