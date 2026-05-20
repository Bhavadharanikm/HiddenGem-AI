import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { syncMetaAds } from "@/lib/meta/sync";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const result = await syncMetaAds(auth.tenantId).catch((err) => {
    console.error("[meta-ads/sync]", err);
    return null;
  });

  if (!result) return error("INTERNAL_ERROR", "Meta Ads sync failed");

  await dispatchWebhook(auth.tenantId, "sync.meta.finished", result).catch(() => {});
  return ok(result);
}
