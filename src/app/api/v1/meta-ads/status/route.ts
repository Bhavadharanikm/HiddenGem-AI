import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";
import { getAdAccounts } from "@/lib/meta/oauth";

export async function GET(req: NextRequest) {
  const isDashboard = req.headers.get("X-Dashboard-Session") === "1";

  if (!isDashboard) {
    const auth = await validateApiKey(req);
    if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");
  }

  const db = getServiceClient();
  const { data: token } = await db
    .from("meta_agency_tokens")
    .select("id, access_token, token_expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!token) return ok({ connected: false, accounts: [] });

  let accounts: Array<{ id: string; name: string }> = [];
  try {
    const raw = await getAdAccounts(token.access_token);
    accounts = raw.map((a) => ({ id: a.account_id, name: a.name }));
  } catch (err) {
    console.error("[meta-ads/status] Failed to fetch ad accounts:", err);
  }

  return ok({
    connected: true,
    token_expires_at: token.token_expires_at,
    accounts,
  });
}
