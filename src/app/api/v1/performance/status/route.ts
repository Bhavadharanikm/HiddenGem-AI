import { NextRequest } from "next/server";
import { error, ok } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const isDashboard = req.headers.get("X-Dashboard-Session") === "1";
  if (!isDashboard) return error("UNAUTHORIZED", "Dashboard session required");

  const tenantId = req.nextUrl.searchParams.get("clientId");
  if (!tenantId) return error("BAD_REQUEST", "clientId required");

  const db = getServiceClient();

  const [pmsConn, metaConn, metricsCount, insightsCount] = await Promise.all([
    db
      .from("pms_connections")
      .select("provider, last_sync_at")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle(),
    db
      .from("meta_client_assignments")
      .select("ad_account_id, account_name, last_sync_at")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle(),
    db
      .from("performance_metrics")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    db
      .from("meta_ad_insights")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  return ok({
    pms: {
      connected: !!pmsConn.data,
      has_metrics: (metricsCount.count ?? 0) > 0,
      provider: pmsConn.data?.provider ?? null,
      last_sync_at: pmsConn.data?.last_sync_at ?? null,
    },
    meta: {
      connected: !!metaConn.data,
      has_insights: (insightsCount.count ?? 0) > 0,
      account_name: metaConn.data?.account_name ?? null,
      last_sync_at: metaConn.data?.last_sync_at ?? null,
    },
  });
}
