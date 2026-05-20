import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { syncTenantDocuments } from "@/lib/google-drive/sync";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const result = await syncTenantDocuments(auth.tenantId).catch((err) => {
    console.error("[google-drive/sync]", err);
    return null;
  });

  if (!result) return error("INTERNAL_ERROR", "Sync failed");

  await dispatchWebhook(auth.tenantId, "document.ready", result).catch(() => {});

  return ok(result);
}
