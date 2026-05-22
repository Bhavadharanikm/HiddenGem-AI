import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const isDashboard = req.headers.get("X-Dashboard-Session") === "1";
  let tenantId: string | null;

  if (isDashboard) {
    tenantId = req.nextUrl.searchParams.get("tenant_id");
  } else {
    const auth = await validateApiKey(req);
    if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");
    tenantId = auth.tenantId;
  }

  if (!tenantId) return error("BAD_REQUEST", "tenant_id required");

  const db = getServiceClient();
  const { data } = await db
    .from("meta_client_assignments")
    .select("ad_account_id, account_name, last_sync_at, is_active")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return ok({ assignment: data ?? null });
}

export async function POST(req: NextRequest) {
  const isDashboard = req.headers.get("X-Dashboard-Session") === "1";

  if (!isDashboard) {
    const auth = await validateApiKey(req);
    if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");
  }

  let body: { tenant_id?: string; ad_account_id?: string; account_name?: string };
  try {
    body = await req.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON");
  }

  if (!body.tenant_id || !body.ad_account_id) {
    return error("BAD_REQUEST", "tenant_id and ad_account_id required");
  }

  const db = getServiceClient();
  const { data, error: dbErr } = await db
    .from("meta_client_assignments")
    .upsert(
      {
        tenant_id: body.tenant_id,
        ad_account_id: body.ad_account_id,
        account_name: body.account_name ?? null,
        is_active: true,
      },
      { onConflict: "tenant_id" }
    )
    .select()
    .single();

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);
  return ok({ assignment: data });
}
