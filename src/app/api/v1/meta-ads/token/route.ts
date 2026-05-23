import { NextRequest } from "next/server";
import { error, ok } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";
import { getAdAccounts } from "@/lib/meta/oauth";
import { encryptToken } from "@/lib/crypto/credentials";

// Accepts a permanent system user token — no OAuth flow needed.
// Validates the token by calling the Graph API before storing.
export async function POST(req: NextRequest) {
  if (req.headers.get("X-Dashboard-Session") !== "1") {
    return error("UNAUTHORIZED", "Dashboard session required");
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON");
  }

  const token = body.token?.trim();
  if (!token) return error("BAD_REQUEST", "token is required");

  // Validate the token is usable before storing it
  let accounts: Array<{ id: string; name: string }> = [];
  try {
    const raw = await getAdAccounts(token);
    accounts = raw.map((a) => ({ id: a.account_id, name: a.name }));
  } catch (err) {
    return error(
      "BAD_REQUEST",
      `Token validation failed: ${err instanceof Error ? err.message : "could not reach Meta API"}`
    );
  }

  const db = getServiceClient();
  // Replace any existing agency token
  await db.from("meta_agency_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("meta_agency_tokens").insert({
    access_token: await encryptToken(token),
    token_expires_at: null, // system user tokens don't expire
    scopes: ["ads_read", "ads_management", "business_management"],
  });

  return ok({ accounts });
}
