import { NextRequest } from "next/server";
import { error, ok } from "@/lib/api/response";
import { exchangeCode } from "@/lib/google-drive/oauth";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) return error("BAD_REQUEST", "Missing code or state");

  let tenantId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    tenantId = decoded.tenantId;
  } catch {
    return error("BAD_REQUEST", "Invalid state parameter");
  }

  const tokens = await exchangeCode(code).catch(() => null);
  if (!tokens?.access_token) return error("INTERNAL_ERROR", "Token exchange failed");

  const db = getServiceClient();
  const { error: dbErr } = await db
    .from("google_drive_connections")
    .upsert(
      {
        tenant_id: tenantId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? "",
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        scopes: tokens.scope?.split(" ") ?? [],
      },
      { onConflict: "tenant_id" }
    );

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);

  return ok({ connected: true });
}
