import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siteUrl = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const db = getServiceClient();

  const { data: connections, error: fetchError } = await db
    .from("pms_connections")
    .select("id, tenant_id")
    .eq("is_active", true);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!connections?.length) return NextResponse.json({ synced: 0 });

  // Group connection IDs by tenant
  const byTenant: Record<string, string[]> = {};
  for (const conn of connections) {
    byTenant[conn.tenant_id] ??= [];
    byTenant[conn.tenant_id].push(conn.id);
  }

  // Mark all connections running
  await db
    .from("pms_connections")
    .update({ sync_status: "running" })
    .in("id", connections.map((c) => c.id));

  if (siteUrl && secret) {
    // Fire one background function per tenant — each runs up to 15 min independently
    await Promise.all(
      Object.entries(byTenant).map(([tenantId, connectionIds]) =>
        fetch(`${siteUrl}/.netlify/functions/pms-sync-bg-background`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
          body: JSON.stringify({ tenant_id: tenantId, connection_ids: connectionIds }),
        }).catch((err) =>
          console.error(`[cron/pms-sync] bg function failed for tenant ${tenantId}:`, err)
        )
      )
    );
  }

  console.log(`[cron/pms-sync] triggered ${Object.keys(byTenant).length} tenant syncs`);
  return NextResponse.json({ tenants: Object.keys(byTenant).length });
}
