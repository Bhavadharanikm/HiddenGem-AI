import { NextRequest } from "next/server";
import { error, ok } from "@/lib/api/response";
import { exchangeCode, getLongLivedToken } from "@/lib/meta/oauth";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) return error("BAD_REQUEST", "Missing code or state");

  let tenantId: string;
  try {
    tenantId = JSON.parse(Buffer.from(state, "base64url").toString()).tenantId;
  } catch {
    return error("BAD_REQUEST", "Invalid state");
  }

  const { shortToken } = await exchangeCode(code).catch(() => ({ shortToken: null as unknown as string }));
  if (!shortToken) return error("INTERNAL_ERROR", "Token exchange failed");

  const { token, expiresAt } = await getLongLivedToken(shortToken);

  const db = getServiceClient();
  const { error: dbErr } = await db.from("meta_connections").upsert(
    {
      tenant_id: tenantId,
      ad_account_id: "pending",
      access_token: token,
      token_expires_at: expiresAt.toISOString(),
      scopes: ["ads_read", "ads_management"],
      is_active: true,
    },
    { onConflict: "tenant_id,ad_account_id" }
  );

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);
  return ok({ connected: true, token_expires_at: expiresAt.toISOString() });
}
